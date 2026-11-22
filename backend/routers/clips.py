import os
import json
import time
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from backend.config import ROOT_DIR, QUEUE_READY, QUEUE_UPLOADED, EXPORTS_DIR, get_config, is_api_key_configured
from backend.services.clipper_engine import (
    render_916_clip,
    validate_quality_gate,
    download_vod_segment,
    inspect_video_url,
    extract_preview_frame,
    suggest_best_moments,
    list_local_exports,
    open_local_export_folder
)
from backend.services.woopsocial_client import (
    upload_media_session,
    create_or_schedule_post,
    verify_connection
)
from backend.services.multi_publisher import publish_clip_multi_platform

router = APIRouter(prefix="/api/clips", tags=["clips"])

# In-memory clipping jobs store
ACTIVE_JOBS: Dict[str, Dict[str, Any]] = {}


class ManualClipRequest(BaseModel):
    url: str
    streamer_name: Optional[str] = "Live Streamer"
    hook_text: Optional[str] = "INSANE MOMENT"
    start_sec: Optional[float] = 0.0
    clip_len: Optional[float] = 25.0
    layout_mode: Optional[str] = "auto"         # "auto", "split", "fullscreen"
    custom_cam_box: Optional[List[float]] = None # [cx, cy, cw, ch]
    hook_style: Optional[str] = "transparent"   # "transparent" or "card"
    caption_color: Optional[str] = "yellow"     # "yellow", "green", "cyan", "pink", "white"
    destination_mode: Optional[str] = "woopsocial" # "woopsocial" or "local_only"


class InspectUrlRequest(BaseModel):
    url: str


class PreviewFrameRequest(BaseModel):
    url: str
    timestamp_sec: float


class FindMomentsRequest(BaseModel):
    duration: float
    title: Optional[str] = ""


class ScheduleClipDirectRequest(BaseModel):
    clip_name: str
    title: str
    yt_description: str
    tiktok_caption: str
    scheduled_for_iso: Optional[str] = None
    account_ids: Optional[List[str]] = None


class PublishLocalExportRequest(BaseModel):
    relative_path: str
    title: str
    yt_description: str
    tiktok_caption: str
    scheduled_for_iso: Optional[str] = None


class PublishMultiRequest(BaseModel):
    clip_name: Optional[str] = None
    relative_path: Optional[str] = None
    title: str
    yt_description: Optional[str] = ""
    tiktok_caption: Optional[str] = ""
    instagram_caption: Optional[str] = ""
    facebook_caption: Optional[str] = ""
    target_platforms: List[str] = ["youtube", "tiktok", "instagram"]
    creator_name: Optional[str] = "Streamer"
    scheduled_for_iso: Optional[str] = None


@router.get("/ready")
def list_ready_clips():
    """Returns all rendered clips in queue/ready/ with metadata."""
    results = []
    if not QUEUE_READY.exists():
        return {"clips": []}

    for mp4 in sorted(QUEUE_READY.glob("*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True):
        meta_file = mp4.with_suffix(".json")
        meta = {
            "clip_name": mp4.name,
            "title": mp4.stem.replace("_", " ").title(),
            "creator": "Unknown",
            "layout_mode": "split",
            "hook_style": "transparent",
            "caption_color": "yellow",
            "file_size_mb": round(mp4.stat().st_size / (1024 * 1024), 2),
            "rendered_at": mp4.stat().st_mtime,
        }
        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta.update(json.load(f))
            except Exception:
                pass

        if "quality_gate" not in meta:
            meta["quality_gate"] = validate_quality_gate(mp4)

        results.append(meta)

    return {"clips": results}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    job = ACTIVE_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _execute_manual_clip_job(job_id: str, req: ManualClipRequest):
    ACTIVE_JOBS[job_id]["status"] = "DOWNLOADING"
    ACTIVE_JOBS[job_id]["progress_log"] = "Starting yt-dlp download..."

    temp_dir = ROOT_DIR / "temp_clipper" / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        def update_log(msg: str):
            ACTIVE_JOBS[job_id]["progress_log"] = msg

        # 1. Download
        dl_res = download_vod_segment(req.url, temp_dir / "raw_vod.mp4")
        raw_file = dl_res["file_path"]
        streamer = req.streamer_name or dl_res.get("uploader", "Streamer")

        # 2. Render
        ACTIVE_JOBS[job_id]["status"] = "RENDERING"
        update_log("Processing video frames and layout mode...")

        safe_title = "".join(c for c in (req.hook_text or "clip") if c.isalnum() or c in (' ', '_', '-')).strip()
        clip_filename = f"{safe_title.replace(' ', '_')[:24]}_{int(time.time())}.mp4"
        dest_clip = QUEUE_READY / clip_filename

        cam_box = tuple(req.custom_cam_box) if (req.custom_cam_box and len(req.custom_cam_box) == 4) else None

        meta = render_916_clip(
            src_video=raw_file,
            dest_clip=dest_clip,
            hook_text=req.hook_text or "VIRAL MOMENT",
            streamer_name=streamer,
            start_sec=req.start_sec or 0.0,
            clip_len=req.clip_len or 25.0,
            layout_mode=req.layout_mode or "auto",
            custom_cam_box=cam_box,
            hook_style=req.hook_style or "transparent",
            caption_color=req.caption_color or "yellow",
            destination_mode=req.destination_mode or "woopsocial",
            progress_callback=update_log
        )

        ACTIVE_JOBS[job_id]["status"] = "COMPLETED"
        ACTIVE_JOBS[job_id]["progress_log"] = "Rendering complete!"
        ACTIVE_JOBS[job_id]["clip_meta"] = meta
        ACTIVE_JOBS[job_id]["clip_name"] = dest_clip.name

    except Exception as e:
        ACTIVE_JOBS[job_id]["status"] = "FAILED"
        ACTIVE_JOBS[job_id]["progress_log"] = f"Failed: {str(e)}"
        ACTIVE_JOBS[job_id]["error"] = str(e)
    finally:
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@router.post("/manual-generate")
def start_manual_clip(req: ManualClipRequest, bg: BackgroundTasks):
    job_id = f"job_{int(time.time() * 1000)}"
    ACTIVE_JOBS[job_id] = {
        "job_id": job_id,
        "status": "QUEUED",
        "progress_log": "Queued for processing...",
        "created_at": time.time(),
        "req": req.model_dump()
    }
    bg.add_task(_execute_manual_clip_job, job_id, req)
    return {"job_id": job_id, "status": "QUEUED"}


# ==============================================================================
# Interactive Manual URL Studio Endpoints
# ==============================================================================

@router.post("/inspect")
def inspect_url(req: InspectUrlRequest):
    """Fetches video title, duration, uploader, and thumbnail from any URL."""
    try:
        data = inspect_video_url(req.url)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/preview-frame")
def preview_frame(req: PreviewFrameRequest):
    """Generates a high-res preview frame at the given timestamp for visual cropping."""
    try:
        image_url = extract_preview_frame(req.url, req.timestamp_sec)
        return {"success": True, "image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/find-moments")
def find_moments(req: FindMomentsRequest):
    """Suggests 3-5 high-engagement highlight moments across the video."""
    moments = suggest_best_moments(req.duration, req.title or "")
    return {"moments": moments}


# ==============================================================================
# Local Exports & Destination Routing Endpoints
# ==============================================================================

@router.get("/exports/local")
def list_exports():
    """Lists all saved clips in exports/local/ with metadata."""
    exports = list_local_exports()
    return {"exports": exports}


@router.post("/exports/open-folder")
def open_folder(subpath: Optional[str] = ""):
    """Opens Windows Explorer to exports/local/."""
    success = open_local_export_folder(subpath or "")
    return {"success": success}


@router.post("/exports/publish")
def publish_local_export(req: PublishLocalExportRequest):
    """Publishes a locally saved clip directly to WoopSocial in 1 click."""
    if not is_api_key_configured():
        raise HTTPException(status_code=400, detail="WoopSocial API Key not configured. Please complete the Setup Wizard.")

    clip_file = EXPORTS_DIR / req.relative_path
    if not clip_file.exists():
        raise HTTPException(status_code=404, detail="Local export file not found")

    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    project_id = cfg.get("selected_project_id", "")
    target_ids = cfg.get("selected_social_accounts", [])

    if not project_id:
        conn = verify_connection(api_key)
        if conn.get("projects"):
            project_id = conn["projects"][0].get("id")

    try:
        media_id = upload_media_session(api_key, project_id, clip_file)
        targets = [{"id": acc_id} for acc_id in target_ids]
        post_res = create_or_schedule_post(
            api_key=api_key,
            project_id=project_id,
            media_id=media_id,
            title=req.title,
            yt_description=req.yt_description,
            tiktok_caption=req.tiktok_caption,
            account_targets=targets,
            scheduled_iso=req.scheduled_for_iso
        )
        return {"success": True, "media_id": media_id, "post": post_res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/publish-multi")
def publish_multi_platform_endpoint(req: PublishMultiRequest):
    """Dispatches a clip to multiple target platforms (YouTube Shorts, TikTok, Instagram, Facebook, Local)."""
    # Locate video file
    clip_file: Optional[Path] = None
    if req.relative_path:
        clip_file = EXPORTS_DIR / req.relative_path
    elif req.clip_name:
        clip_file = QUEUE_READY / req.clip_name
        if not clip_file.exists():
            clip_file = QUEUE_UPLOADED / req.clip_name
        if not clip_file.exists():
            found = list(EXPORTS_DIR.glob(f"**/{req.clip_name}"))
            if found:
                clip_file = found[0]

    if not clip_file or not clip_file.exists():
        raise HTTPException(status_code=404, detail="Clip file not found")

    captions = {
        "youtube_desc": req.yt_description or req.title,
        "tiktok": req.tiktok_caption or req.title,
        "instagram": req.instagram_caption or req.title,
        "facebook": req.facebook_caption or req.title
    }

    try:
        res = publish_clip_multi_platform(
            clip_path=clip_file,
            title=req.title,
            captions=captions,
            target_platforms=req.target_platforms or ["youtube", "tiktok", "instagram"],
            creator_name=req.creator_name or "Streamer",
            scheduled_iso=req.scheduled_for_iso
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/{clip_name}")
def stream_clip_video(clip_name: str, range: Optional[str] = Header(None)):
    """Streams MP4 video with HTTP 206 Range support for HTML5 scrubbers."""
    file_path = QUEUE_READY / clip_name
    if not file_path.exists():
        file_path = QUEUE_UPLOADED / clip_name
    if not file_path.exists():
        # Check exports recursively
        found = list(EXPORTS_DIR.glob(f"**/{clip_name}"))
        if found:
            file_path = found[0]

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Clip not found")

    file_size = file_path.stat().st_size
    start = 0
    end = file_size - 1

    if range:
        range_val = range.strip().replace("bytes=", "")
        parts = range_val.split("-")
        if parts[0]:
            start = int(parts[0])
        if len(parts) > 1 and parts[1]:
            end = int(parts[1])

    chunk_size = (end - start) + 1

    def iter_file():
        with open(file_path, "rb") as f:
            f.seek(start)
            bytes_left = chunk_size
            while bytes_left > 0:
                read_amount = min(bytes_left, 1024 * 1024)
                data = f.read(read_amount)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(iter_file(), status_code=status.HTTP_206_PARTIAL_CONTENT, headers=headers)


@router.delete("/{clip_name}")
def delete_ready_clip(clip_name: str):
    file_path = QUEUE_READY / clip_name
    meta_path = file_path.with_suffix(".json")
    if file_path.exists():
        file_path.unlink(missing_ok=True)
    if meta_path.exists():
        meta_path.unlink(missing_ok=True)
    return {"success": True, "message": f"Deleted {clip_name}"}


@router.post("/schedule-direct")
def schedule_clip_directly(req: ScheduleClipDirectRequest):
    """Uploads local clip and schedules it to WoopSocial in one click."""
    clip_path = QUEUE_READY / req.clip_name
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail=f"Local clip {req.clip_name} not found")

    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    project_id = cfg.get("selected_project_id", "")
    target_ids = req.account_ids or cfg.get("selected_social_accounts", [])

    if not api_key:
        raise HTTPException(status_code=400, detail="WoopSocial API key not configured")

    if not project_id:
        conn = verify_connection(api_key)
        projects = conn.get("projects", [])
        if projects:
            project_id = projects[0].get("id")

    try:
        media_id = upload_media_session(api_key, project_id, clip_path)
        targets = [{"id": acc_id} for acc_id in target_ids]
        post_res = create_or_schedule_post(
            api_key=api_key,
            project_id=project_id,
            media_id=media_id,
            title=req.title,
            yt_description=req.yt_description,
            tiktok_caption=req.tiktok_caption,
            account_targets=targets,
            scheduled_iso=req.scheduled_for_iso
        )

        if cfg.get("preferences", {}).get("auto_delete_local_clips", True):
            clip_path.unlink(missing_ok=True)
            clip_path.with_suffix(".json").unlink(missing_ok=True)

        return {"success": True, "media_id": media_id, "post": post_res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
