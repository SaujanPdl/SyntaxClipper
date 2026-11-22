"""publisher.py - Unified Multi-Platform Publishing Router
Handles smart multi-platform dispatching according to publishing_mode:
- "hybrid": Direct YouTube Data API v3 (native schedule via status.publishAt) + Zernio for TikTok/Instagram/Facebook
- "zernio": All-in-One Zernio multi-platform pipeline (YouTube, TikTok, Instagram, Facebook)
- "youtube_direct": Direct YouTube Data API v3 uploads and native studio scheduling
- "local_only": Offline rendering with automatic exports/local/<creator>/ organization
- "woopsocial": Legacy WoopSocial integration

Reads config.json dynamically on every publish call to avoid stale API keys and prevent HTTP 401 errors.
"""

import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.config import ROOT_DIR, EXPORTS_DIR, YOUTUBE_TOKEN_PATH, get_config
from backend.youtube_publisher import schedule_youtube_short
from backend.services.zernio_client import create_zernio_post
from backend.services.woopsocial_client import upload_media_session, create_or_schedule_post

logger = logging.getLogger("syntaxclipper.publisher")


def save_local_export(
    clip_path: Path,
    title: str,
    creator_name: str,
    captions: Dict[str, str]
) -> Dict[str, Any]:
    """Saves a permanent local copy with accompanying metadata text file."""
    creator_clean = "".join(c for c in creator_name if c.isalnum() or c in (' ', '_', '-')).strip().replace(" ", "_")
    dest_folder = EXPORTS_DIR / creator_clean
    dest_folder.mkdir(parents=True, exist_ok=True)
    dest_file = dest_folder / clip_path.name

    if clip_path.resolve() != dest_file.resolve():
        shutil.copyfile(clip_path, dest_file)

    meta_file = dest_file.with_name(f"{dest_file.stem}_metadata.txt")
    yt_desc = captions.get("youtube_desc") or f"{title}\n\nCreator: {creator_name}\n#Shorts"
    tt_cap = captions.get("tiktok") or f"{title} 🔥 #shorts #gaming #viral"
    ig_cap = captions.get("instagram") or f"{title} 🔥 #reels #gaming"

    meta_content = (
        f"=== SYNTAXCLIPPER LOCAL EXPORT ===\n"
        f"Title: {title}\n"
        f"Creator: {creator_name}\n\n"
        f"--- YOUTUBE SHORTS ---\n"
        f"Title: {title[:90]} #Shorts\n"
        f"Description:\n{yt_desc}\n\n"
        f"--- TIKTOK ---\n"
        f"Caption: {tt_cap}\n\n"
        f"--- INSTAGRAM REELS ---\n"
        f"Caption: {ig_cap}\n"
    )
    with open(meta_file, "w", encoding="utf-8") as f:
        f.write(meta_content)

    return {
        "status": "SAVED_LOCALLY",
        "provider": "local_filesystem",
        "file_path": str(dest_file),
        "folder": str(dest_folder)
    }


def publish_clip(
    clip_path: Path,
    title: str,
    captions: Dict[str, str],
    target_platforms: List[str],
    creator_name: str = "Streamer",
    scheduled_iso: Optional[str] = None,
    progress_callback = None
) -> Dict[str, Any]:
    """Main publishing entry point for SyntaxClipper.
    Dynamically reloads config.json on every call so user credentials and modes take effect immediately.
    """
    if not clip_path.exists():
        raise FileNotFoundError(f"Clip file not found: {clip_path}")

    # Fresh config reload
    cfg = get_config()
    mode = cfg.get("publishing_mode", "hybrid")
    zernio_key = cfg.get("zernio_api_key", "").strip()
    woop_key = cfg.get("woopsocial_api_key", "").strip()
    yt_privacy = cfg.get("youtube_default_privacy", "private")
    has_direct_yt = YOUTUBE_TOKEN_PATH.exists()

    results: Dict[str, Any] = {
        "success": True,
        "clip_name": clip_path.name,
        "publishing_mode": mode,
        "platform_results": {},
        "errors": []
    }

    clean_title = title.replace("#Shorts", "").replace("#shorts", "").strip()
    yt_title = f"{clean_title[:88]} #Shorts"
    yt_desc = captions.get("youtube_desc") or f"{clean_title}\n\nCreator: {creator_name}\n#Shorts"

    # Always ensure local export if requested or if local_only mode
    if mode == "local_only" or "local" in target_platforms or not any(p for p in target_platforms if p != "local"):
        try:
            results["platform_results"]["local"] = save_local_export(clip_path, title, creator_name, captions)
            if mode == "local_only":
                return results
        except Exception as e:
            logger.error(f"Failed to save local export: {e}")
            results["errors"].append(f"Local export error: {str(e)}")

    # 1. HYBRID PRO MODE (YouTube Direct + Zernio for TikTok/Instagram/Facebook)
    if mode == "hybrid":
        # Handle YouTube Shorts via Direct API
        if "youtube" in target_platforms:
            yt_handled = False
            if has_direct_yt:
                try:
                    if progress_callback:
                        progress_callback("Uploading & scheduling YouTube Short via Direct Data API v3...")
                    yt_res = schedule_youtube_short(
                        video_path=clip_path,
                        title=yt_title,
                        description=yt_desc,
                        scheduled_iso_utc=scheduled_iso,
                        tags=["Shorts", "gaming", "viral", creator_name],
                        privacy_status=yt_privacy,
                        progress_callback=progress_callback
                    )
                    results["platform_results"]["youtube"] = {
                        "status": "SCHEDULED" if scheduled_iso else ("PUBLISHED" if yt_privacy == "public" else "UPLOADED_PRIVATE"),
                        "provider": "youtube_direct_v3",
                        "video_id": yt_res.get("video_id"),
                        "url": yt_res.get("url"),
                        "scheduled_at": scheduled_iso,
                        "privacy": yt_res.get("privacy_status")
                    }
                    yt_handled = True
                except Exception as e:
                    logger.warning(f"Direct YouTube scheduling failed in Hybrid mode: {e}")
                    results["errors"].append(f"YouTube Direct API: {str(e)}")

            # Fallback for YouTube to Zernio if Direct YouTube not configured or failed
            if not yt_handled and zernio_key:
                try:
                    if progress_callback:
                        progress_callback("Falling back YouTube to Zernio pipeline...")
                    z_res = create_zernio_post(
                        api_key=zernio_key,
                        media_path=clip_path,
                        platforms=["youtube"],
                        title=yt_title,
                        captions={"youtube": yt_desc},
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
                    logger.warning(f"Zernio fallback for YouTube failed: {e}")
                    results["errors"].append(f"Zernio (YouTube): {str(e)}")

        # Handle Social Channels (TikTok, Instagram, Facebook) via Zernio
        social_channels = [p for p in target_platforms if p in ("tiktok", "instagram", "facebook", "x")]
        if social_channels and zernio_key:
            try:
                if progress_callback:
                    progress_callback(f"Posting to {', '.join(social_channels)} via Zernio...")
                z_res = create_zernio_post(
                    api_key=zernio_key,
                    media_path=clip_path,
                    platforms=social_channels,
                    title=clean_title,
                    captions=captions,
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
                logger.warning(f"Zernio social channels post failed in Hybrid mode: {e}")
                results["errors"].append(f"Zernio ({','.join(social_channels)}): {str(e)}")

        elif social_channels and not zernio_key and woop_key and "tiktok" in social_channels:
            # Fallback to WoopSocial for TikTok if configured
            try:
                project_id = cfg.get("selected_project_id", "")
                target_ids = cfg.get("selected_social_accounts", [])
                tt_accounts = [acc for acc in target_ids if "tiktok" in str(acc).lower() or str(acc).startswith("tt")]
                media_id = upload_media_session(woop_key, project_id, clip_path)
                w_res = create_or_schedule_post(
                    api_key=woop_key,
                    project_id=project_id,
                    media_id=media_id,
                    title=clean_title,
                    yt_description=yt_desc,
                    tiktok_caption=captions.get("tiktok") or clean_title,
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
                results["errors"].append(f"WoopSocial (TikTok): {str(e)}")

    # 2. ALL-IN-ONE ZERNIO MODE
    elif mode == "zernio":
        z_platforms = [p for p in target_platforms if p in ("youtube", "tiktok", "instagram", "facebook", "x")]
        if z_platforms:
            if not zernio_key:
                results["errors"].append("Zernio API Key is not configured. Please enter your key in Setup Wizard.")
            else:
                try:
                    if progress_callback:
                        progress_callback(f"Scheduling post on Zernio for {', '.join(z_platforms)}...")
                    z_res = create_zernio_post(
                        api_key=zernio_key,
                        media_path=clip_path,
                        platforms=z_platforms,
                        title=yt_title if "youtube" in z_platforms else clean_title,
                        captions=captions,
                        scheduled_iso=scheduled_iso
                    )
                    for zp in z_platforms:
                        results["platform_results"][zp] = {
                            "status": "SCHEDULED" if scheduled_iso else "PUBLISHED",
                            "provider": "zernio",
                            "post_id": z_res.get("id"),
                            "scheduled_at": scheduled_iso
                        }
                except Exception as e:
                    logger.error(f"All-in-One Zernio post failed: {e}")
                    results["errors"].append(f"Zernio ({','.join(z_platforms)}): {str(e)}")

    # 3. YOUTUBE DIRECT ONLY MODE
    elif mode == "youtube_direct":
        if "youtube" in target_platforms:
            try:
                if progress_callback:
                    progress_callback("Uploading to YouTube via Direct Data API v3...")
                yt_res = schedule_youtube_short(
                    video_path=clip_path,
                    title=yt_title,
                    description=yt_desc,
                    scheduled_iso_utc=scheduled_iso,
                    tags=["Shorts", "gaming", "viral", creator_name],
                    privacy_status=yt_privacy,
                    progress_callback=progress_callback
                )
                results["platform_results"]["youtube"] = {
                    "status": "SCHEDULED" if scheduled_iso else ("PUBLISHED" if yt_privacy == "public" else "UPLOADED_PRIVATE"),
                    "provider": "youtube_direct_v3",
                    "video_id": yt_res.get("video_id"),
                    "url": yt_res.get("url"),
                    "scheduled_at": scheduled_iso,
                    "privacy": yt_res.get("privacy_status")
                }
            except Exception as e:
                results["errors"].append(f"YouTube Direct API: {str(e)}")

    # 4. WOOPSOCIAL ONLY MODE (Legacy)
    elif mode == "woopsocial":
        if not woop_key:
            results["errors"].append("WoopSocial API Key is not configured.")
        else:
            try:
                project_id = cfg.get("selected_project_id", "")
                target_ids = cfg.get("selected_social_accounts", [])
                media_id = upload_media_session(woop_key, project_id, clip_path)
                w_res = create_or_schedule_post(
                    api_key=woop_key,
                    project_id=project_id,
                    media_id=media_id,
                    title=clean_title,
                    yt_description=yt_desc,
                    tiktok_caption=captions.get("tiktok") or clean_title,
                    account_targets=[{"id": acc} for acc in target_ids] if target_ids else None,
                    scheduled_iso=scheduled_iso
                )
                for p in target_platforms:
                    if p != "local":
                        results["platform_results"][p] = {
                            "status": "SCHEDULED" if scheduled_iso else "PUBLISHED",
                            "provider": "woopsocial",
                            "post_id": w_res.get("id"),
                            "scheduled_at": scheduled_iso
                        }
            except Exception as e:
                results["errors"].append(f"WoopSocial: {str(e)}")

    # Check overall success: if no remote platforms succeeded and errors occurred, save safe local copy
    if not results["platform_results"] and results["errors"]:
        results["success"] = False
        try:
            results["platform_results"]["local"] = save_local_export(clip_path, title, creator_name, captions)
            results["local_fallback"] = True
        except Exception:
            pass

    return results
