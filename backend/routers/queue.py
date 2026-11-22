"""queue.py - Dynamic Multi-Provider Queue and Post Management Router
Supports Unified Queue: combines Zernio Multi-Platform Posts, Direct YouTube Studio Scheduled Videos,
and Exact Failed Post Diagnostics with 1-Click Retry.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from pathlib import Path
from backend.config import get_config, get_active_provider, QUEUE_READY, QUEUE_UPLOADED, EXPORTS_DIR
from backend.youtube_publisher import get_scheduled_youtube_videos, delete_scheduled_youtube_video
from backend.publisher import (
    load_failed_posts,
    save_failed_posts,
    clear_failed_post,
    publish_clip
)
from backend.services.zernio_client import (
    get_zernio_posts,
    delete_zernio_post,
    retry_zernio_post
)
from backend.services.woopsocial_client import (
    get_social_account_posts,
    retry_failed_post,
    delete_social_post
)

router = APIRouter(prefix="/api/queue", tags=["queue"])


@router.get("/status")
def get_queue_status():
    """Returns the current active publishing provider and connection state."""
    cfg = get_config()
    active_info = get_active_provider(cfg)
    return active_info


@router.get("")
@router.get("/")
@router.get("/posts")
def list_queue_posts(status: Optional[str] = None):
    """Dynamically routes post queue retrieval based on active provider mode:
    - In Hybrid Pro mode: merges Zernio queue posts, Direct YouTube Studio Scheduled videos, and exact failed posts.
    - In Zernio mode: queries Zernio REST API + failed posts.
    - In YouTube Direct mode: queries YouTube Studio scheduled videos + failed posts.
    - In Local Only mode: returns local buffer status.
    Hardened against partial provider failures: never crashes or raises HTTP errors on 401 or network timeouts.
    """
    cfg = get_config()
    active_info = get_active_provider(cfg)
    provider = active_info.get("provider", "hybrid")
    status_filter = (status or "ALL").upper()

    all_posts: List[Dict[str, Any]] = []
    warnings: List[str] = []

    # 1. Independent local failed posts loader
    try:
        failed_items = load_failed_posts()
    except Exception as e:
        failed_items = []
        warnings.append(f"Local failed log unavailable: {e}")

    # Helper to add failed items if filter matches
    def append_failed_posts():
        if status_filter in ("ALL", "FAILED"):
            seen_ids = {p.get("postId") or p.get("socialAccountPostId") or p.get("id") for p in all_posts}
            for f in failed_items:
                fid = f.get("postId") or f.get("socialAccountPostId") or f.get("id")
                if fid not in seen_ids:
                    all_posts.append(f)
                    seen_ids.add(fid)

    # 2. HYBRID PRO MODE (YouTube Direct + Zernio)
    if provider == "hybrid":
        zernio_key = cfg.get("zernio_api_key", "").strip()

        # Independent Zernio fetch
        if zernio_key:
            try:
                z_posts = get_zernio_posts(zernio_key, status_filter=status_filter)
                all_posts.extend(z_posts)
            except ValueError as e:
                warnings.append(str(e))
            except Exception as e:
                warnings.append(f"Zernio sync notice: {str(e)}")

        # Independent YouTube Studio Scheduled posts fetch
        try:
            yt_posts = get_scheduled_youtube_videos(filter_status=status_filter)
            all_posts.extend(yt_posts)
        except Exception as e:
            warnings.append(f"YouTube Direct sync notice: {str(e)}")

        # Include local failed posts diagnostics
        append_failed_posts()

        # Sort combined list: Scheduled items first by scheduledFor, then by createdAt desc
        def sort_key(item):
            t = item.get("scheduledFor") or item.get("publishAt") or item.get("createdAt") or ""
            return t

        all_posts.sort(key=sort_key, reverse=True)

        return {
            "posts": all_posts,
            "provider": "hybrid",
            "provider_name": "Hybrid Pro (YouTube + Zernio)",
            "total": len(all_posts),
            "warning": " | ".join(warnings) if warnings else None
        }

    # 3. ALL-IN-ONE ZERNIO MODE
    elif provider == "zernio":
        zernio_key = cfg.get("zernio_api_key", "").strip()
        if not zernio_key:
            append_failed_posts()
            return {
                "posts": all_posts,
                "provider": "zernio",
                "provider_name": "Zernio",
                "total": len(all_posts),
                "warning": "Zernio API key is empty. Configure it in Settings & Wizard."
            }
        try:
            posts = get_zernio_posts(zernio_key, status_filter=status_filter)
            all_posts.extend(posts)
        except ValueError as e:
            warnings.append(str(e))
        except Exception as e:
            warnings.append(f"Zernio sync notice: {str(e)}")

        append_failed_posts()
        return {
            "posts": all_posts,
            "provider": "zernio",
            "provider_name": "Zernio",
            "total": len(all_posts),
            "warning": " | ".join(warnings) if warnings else None
        }

    # 4. YOUTUBE DIRECT ONLY MODE
    elif provider == "youtube_direct":
        try:
            yt_posts = get_scheduled_youtube_videos(filter_status=status_filter)
            all_posts.extend(yt_posts)
        except Exception as e:
            warnings.append(f"YouTube Studio sync notice: {str(e)}")

        append_failed_posts()
        return {
            "posts": all_posts,
            "provider": "youtube_direct",
            "provider_name": "YouTube Studio Scheduled",
            "total": len(all_posts),
            "warning": " | ".join(warnings) if warnings else None
        }

    # 5. WOOPSOCIAL (LEGACY)
    elif provider == "woopsocial":
        woop_key = cfg.get("woopsocial_api_key", "").strip()
        if not woop_key:
            append_failed_posts()
            return {
                "posts": all_posts,
                "provider": "woopsocial",
                "provider_name": "WoopSocial",
                "total": len(all_posts),
                "warning": "WoopSocial API key is empty. Configure it in Settings & Wizard."
            }
        try:
            posts = get_social_account_posts(woop_key, status_filter=status_filter)
            all_posts.extend(posts)
        except Exception as e:
            warnings.append(f"WoopSocial sync notice: {str(e)}")

        append_failed_posts()
        return {
            "posts": all_posts,
            "provider": "woopsocial",
            "provider_name": "WoopSocial",
            "total": len(all_posts),
            "warning": " | ".join(warnings) if warnings else None
        }

    # 6. LOCAL ONLY
    append_failed_posts()
    return {
        "posts": all_posts,
        "provider": "local_only",
        "provider_name": "Local Export",
        "total": len(all_posts),
        "message": "Connected in Local Mode. Clips are saved to exports/local/<creator>/.",
        "warning": " | ".join(warnings) if warnings else None
    }


@router.post("/retry/{post_id}")
def retry_queue_post(post_id: str):
    """Retries a failed post with the active provider.
    If the failed post was logged locally in posted_log.json, re-dispatches publish_clip.
    """
    failed_posts = load_failed_posts()
    matching = next(
        (p for p in failed_posts if p.get("id") == post_id or p.get("postId") == post_id or p.get("socialAccountPostId") == post_id),
        None
    )

    if matching:
        clip_path_str = matching.get("clip_path")
        clip_path = Path(clip_path_str) if clip_path_str else None
        if not clip_path or not clip_path.exists():
            # Search in QUEUE_READY, QUEUE_UPLOADED, EXPORTS_DIR
            clip_name = matching.get("clip_name") or (clip_path.name if clip_path else "")
            candidates = list(QUEUE_READY.glob(clip_name)) + list(QUEUE_UPLOADED.glob(clip_name)) + list(EXPORTS_DIR.glob(f"**/{clip_name}"))
            if candidates:
                clip_path = candidates[0]

        if not clip_path or not clip_path.exists():
            raise HTTPException(status_code=404, detail="Original clip video file not found on disk to retry")

        # Retry publishing with fresh credentials
        res = publish_clip(
            clip_path=clip_path,
            title=matching.get("title") or clip_path.stem,
            captions=matching.get("captions") or {},
            target_platforms=matching.get("target_platforms") or ["youtube", "tiktok", "instagram"],
            creator_name=matching.get("creator_name") or "Streamer",
            scheduled_iso=matching.get("scheduled_iso")
        )

        if res.get("success"):
            clear_failed_post(post_id)
            return {"success": True, "message": "Post retried and published successfully!", "result": res}
        else:
            err_msg = "; ".join(res.get("errors", [])) or "Retry failed again with active provider"
            matching["errorMessage"] = err_msg
            matching["error"] = err_msg
            matching["failedReason"] = err_msg
            save_failed_posts(failed_posts)
            raise HTTPException(status_code=400, detail=err_msg)

    # Remote provider retry fallback (Zernio / WoopSocial)
    cfg = get_config()
    zernio_key = cfg.get("zernio_api_key", "").strip()

    if post_id.startswith("zn_") or zernio_key:
        if not zernio_key:
            raise HTTPException(status_code=400, detail="Zernio API Key not configured")
        res = retry_zernio_post(zernio_key, post_id)
        return res

    woop_key = cfg.get("woopsocial_api_key", "").strip()
    if woop_key:
        try:
            res = retry_failed_post(woop_key, post_id)
            return {"success": True, "result": res}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=400, detail="Failed post not found or provider credentials missing")


@router.delete("/posts/{post_id}")
def delete_queue_post(post_id: str):
    """Deletes or cancels a post from YouTube Studio, Zernio, or failed local log."""
    if post_id.startswith("failed_"):
        clear_failed_post(post_id)
        return {"success": True, "message": f"Failed post {post_id} removed from queue"}

    if post_id.startswith("yt_"):
        success = delete_scheduled_youtube_video(post_id)
        return {"success": success, "message": f"YouTube scheduled video {post_id} removed"}

    cfg = get_config()
    zernio_key = cfg.get("zernio_api_key", "").strip()

    if zernio_key:
        res = delete_zernio_post(zernio_key, post_id)
        return res

    woop_key = cfg.get("woopsocial_api_key", "").strip()
    if woop_key:
        try:
            res = delete_social_post(woop_key, post_id)
            return {"success": True, "result": res}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return {"success": True, "message": "Post removed from local buffer"}
