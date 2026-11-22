"""multi_publisher.py - Modular Multi-Platform Publishing Dispatcher
Coordinates unified posting across YouTube Shorts, TikTok, Instagram Reels, Facebook Reels, and Local Storage.
Supports Hybrid Mode (Direct YouTube Data API + Zernio/WoopSocial + Local).
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.config import ROOT_DIR, EXPORTS_DIR, QUEUE_READY, QUEUE_UPLOADED, get_config
from backend.services.zernio_client import create_zernio_post
from backend.services.youtube_direct_client import upload_youtube_direct, get_oauth_status
from backend.services.woopsocial_client import upload_media_session, create_or_schedule_post

logger = logging.getLogger("syntaxclipper.multi_publisher")


def publish_clip_multi_platform(
    clip_path: Path,
    title: str,
    captions: Dict[str, str],
    target_platforms: List[str],
    creator_name: str = "Streamer",
    scheduled_iso: Optional[str] = None,
    progress_callback = None
) -> Dict[str, Any]:
    """Dispatches a rendered clip across selected target platforms using the best available provider.
    
    target_platforms: e.g. ['youtube', 'tiktok', 'instagram', 'facebook', 'local']
    captions: {
        'youtube_desc': '...',
        'tiktok': '...',
        'instagram': '...',
        'facebook': '...'
    }
    """
    if not clip_path.exists():
        raise FileNotFoundError(f"Clip not found: {clip_path}")

    cfg = get_config()
    zernio_key = cfg.get("zernio_api_key", "").strip()
    woop_key = cfg.get("woopsocial_api_key", "").strip()
    yt_privacy = cfg.get("youtube_default_privacy", "private")
    yt_status = get_oauth_status()
    has_direct_yt = yt_status.get("configured", False)

    results: Dict[str, Any] = {
        "success": True,
        "clip_name": clip_path.name,
        "platform_results": {},
        "errors": []
    }

    # 1. Local Export (if requested or as safe backup)
    if "local" in target_platforms or not any(p for p in target_platforms if p != "local"):
        creator_clean = "".join(c for c in creator_name if c.isalnum() or c in (' ', '_', '-')).strip().replace(" ", "_")
        dest_folder = EXPORTS_DIR / creator_clean
        dest_folder.mkdir(parents=True, exist_ok=True)
        dest_file = dest_folder / clip_path.name

        import shutil
        if clip_path.resolve() != dest_file.resolve():
            shutil.copyfile(clip_path, dest_file)

        # Write metadata
        meta_file = dest_file.with_name(f"{dest_file.stem}_metadata.txt")
        yt_desc = captions.get("youtube_desc") or f"{title}\n\nCreator: {creator_name}\n#Shorts"
        tt_cap = captions.get("tiktok") or f"{title} 🔥 #shorts #gaming #viral"
        ig_cap = captions.get("instagram") or f"{title} 🔥 #reels #gaming"

        meta_content = (
            f"=== SYNTAXCLIPPER EXPORT METADATA ===\n"
            f"Title: {title}\n"
            f"Creator: {creator_name}\n\n"
            f"--- YOUTUBE SHORTS ---\n"
            f"Title: {title[:90]} #Shorts\n"
            f"Description:\n{yt_desc}\n\n"
            f"--- TIKTOK & REELS ---\n"
            f"Caption: {tt_cap}\n\n"
            f"--- INSTAGRAM REELS ---\n"
            f"Caption: {ig_cap}\n"
        )
        with open(meta_file, "w", encoding="utf-8") as f:
            f.write(meta_content)

        results["platform_results"]["local"] = {
            "status": "SAVED_LOCALLY",
            "provider": "local_filesystem",
            "file_path": str(dest_file),
            "folder": str(dest_folder)
        }

    # 2. YouTube Shorts
    if "youtube" in target_platforms:
        yt_handled = False
        # Prefer Direct YouTube Data API v3 if authorized (free 100 uploads/day)
        if has_direct_yt:
            try:
                if progress_callback:
                    progress_callback("Uploading to YouTube via Direct Data API v3...")
                yt_desc = captions.get("youtube_desc") or f"{title}\n\nCreator: {creator_name}\n#Shorts"
                yt_res = upload_youtube_direct(
                    video_path=clip_path,
                    title=f"{title[:90]} #Shorts",
                    description=yt_desc,
                    tags=["Shorts", "gaming", "viral", creator_name],
                    privacy_status=yt_privacy,
                    progress_callback=progress_callback
                )
                results["platform_results"]["youtube"] = {
                    "status": "PUBLISHED" if yt_privacy == "public" else "UPLOADED_PRIVATE",
                    "provider": "youtube_direct_v3",
                    "video_id": yt_res.get("video_id"),
                    "url": yt_res.get("url"),
                    "privacy": yt_privacy
                }
                yt_handled = True
            except Exception as e:
                logger.warning(f"Direct YouTube upload failed, falling back: {e}")
                results["errors"].append(f"Direct YouTube API: {str(e)}")

        # If not handled, try Zernio
        if not yt_handled and zernio_key:
            try:
                z_res = create_zernio_post(
                    api_key=zernio_key,
                    media_path=clip_path,
                    platforms=["youtube"],
                    title=f"{title[:90]} #Shorts",
                    captions={"youtube": captions.get("youtube_desc") or title},
                    scheduled_iso=scheduled_iso
                )
                results["platform_results"]["youtube"] = {
                    "status": "SCHEDULED" if scheduled_iso else "PUBLISHED",
                    "provider": "zernio",
                    "post_id": z_res.get("id"),
                    "scheduled_at": scheduled_iso
                }
                yt_handled = True
            except Exception as e:
                logger.warning(f"Zernio YouTube post failed: {e}")
                results["errors"].append(f"Zernio (YouTube): {str(e)}")

        # If still not handled, try WoopSocial
        if not yt_handled and woop_key:
            try:
                project_id = cfg.get("selected_project_id", "")
                target_ids = cfg.get("selected_social_accounts", [])
                yt_accounts = [acc for acc in target_ids if "youtube" in str(acc).lower() or not str(acc).startswith("tt")]
                media_id = upload_media_session(woop_key, project_id, clip_path)
                w_res = create_or_schedule_post(
                    api_key=woop_key,
                    project_id=project_id,
                    media_id=media_id,
                    title=title,
                    yt_description=captions.get("youtube_desc") or f"{title}\n#Shorts",
                    tiktok_caption=captions.get("tiktok") or title,
                    account_targets=[{"id": acc} for acc in yt_accounts] if yt_accounts else None,
                    scheduled_iso=scheduled_iso
                )
                results["platform_results"]["youtube"] = {
                    "status": "SCHEDULED" if scheduled_iso else "PUBLISHED",
                    "provider": "woopsocial",
                    "post_id": w_res.get("id"),
                    "scheduled_at": scheduled_iso
                }
                yt_handled = True
            except Exception as e:
                logger.warning(f"WoopSocial YouTube post failed: {e}")
                results["errors"].append(f"WoopSocial (YouTube): {str(e)}")

    # 3. TikTok, Instagram, Facebook (via Zernio or WoopSocial)
    social_channels = [p for p in target_platforms if p in ("tiktok", "instagram", "facebook", "x")]
    if social_channels:
        if zernio_key:
            try:
                z_res = create_zernio_post(
                    api_key=zernio_key,
                    media_path=clip_path,
                    platforms=social_channels,
                    title=title,
                    captions={
                        "tiktok": captions.get("tiktok") or title,
                        "instagram": captions.get("instagram") or title,
                        "facebook": captions.get("facebook") or title,
                        "x": captions.get("x") or title
                    },
                    scheduled_iso=scheduled_iso
                )
                for sc in social_channels:
                    results["platform_results"][sc] = {
                        "status": "SCHEDULED" if scheduled_iso else "PUBLISHED",
                        "provider": "zernio",
                        "post_id": z_res.get("id"),
                        "scheduled_at": scheduled_iso
                    }
            except Exception as e:
                logger.warning(f"Zernio social channels post failed: {e}")
                results["errors"].append(f"Zernio ({','.join(social_channels)}): {str(e)}")

        elif "tiktok" in social_channels and woop_key:
            # Fallback WoopSocial for TikTok
            try:
                project_id = cfg.get("selected_project_id", "")
                target_ids = cfg.get("selected_social_accounts", [])
                tt_accounts = [acc for acc in target_ids if "tiktok" in str(acc).lower() or str(acc).startswith("tt")]
                media_id = upload_media_session(woop_key, project_id, clip_path)
                w_res = create_or_schedule_post(
                    api_key=woop_key,
                    project_id=project_id,
                    media_id=media_id,
                    title=title,
                    yt_description=captions.get("youtube_desc") or title,
                    tiktok_caption=captions.get("tiktok") or title,
                    account_targets=[{"id": acc} for acc in tt_accounts] if tt_accounts else None,
                    scheduled_iso=scheduled_iso
                )
                results["platform_results"]["tiktok"] = {
                    "status": "SCHEDULED" if scheduled_iso else "PUBLISHED",
                    "provider": "woopsocial",
                    "post_id": w_res.get("id"),
                    "scheduled_at": scheduled_iso
                }
            except Exception as e:
                logger.warning(f"WoopSocial TikTok post failed: {e}")
                results["errors"].append(f"WoopSocial (TikTok): {str(e)}")

    # Check overall success
    if not results["platform_results"] and results["errors"]:
        results["success"] = False

    return results
