"""queue.py - Dynamic Multi-Provider Queue and Post Management Router
Supports Unified Queue: combines Zernio Multi-Platform Posts and Direct YouTube Studio Scheduled Videos.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from backend.config import get_config, get_active_provider
from backend.youtube_publisher import get_scheduled_youtube_videos, delete_scheduled_youtube_video
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


@router.get("/posts")
def list_queue_posts(status: Optional[str] = None):
    """Dynamically routes post queue retrieval based on active provider mode:
    - In Hybrid Pro mode: merges Zernio queue posts and Direct YouTube Studio Scheduled videos.
    - In Zernio mode: queries Zernio REST API.
    - In YouTube Direct mode: queries local and remote YouTube Studio scheduled videos.
    - In Local Only mode: returns local buffer status.
    """
    cfg = get_config()
    active_info = get_active_provider(cfg)
    provider = active_info.get("provider", "hybrid")
    status_filter = (status or "ALL").upper()

    all_posts: List[Dict[str, Any]] = []

    # 1. HYBRID PRO MODE (YouTube Direct + Zernio)
    if provider == "hybrid":
        zernio_key = cfg.get("zernio_api_key", "").strip()
        zernio_error = None

        # Fetch Zernio posts if key configured
        if zernio_key:
            try:
                z_posts = get_zernio_posts(zernio_key, status_filter=status_filter)
                all_posts.extend(z_posts)
            except ValueError as e:
                if "401" in str(e) or "unauthorized" in str(e).lower():
                    zernio_error = "Zernio API Key is invalid or unauthorized."
            except Exception as e:
                zernio_error = f"Zernio sync error: {str(e)}"

        # Fetch YouTube Studio Scheduled posts
        try:
            yt_posts = get_scheduled_youtube_videos(filter_status=status_filter)
            all_posts.extend(yt_posts)
        except Exception as e:
            pass

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
            "warning": zernio_error
        }

    # 2. ALL-IN-ONE ZERNIO MODE
    elif provider == "zernio":
        zernio_key = cfg.get("zernio_api_key", "").strip()
        if not zernio_key:
            return {
                "posts": [],
                "provider": "zernio",
                "provider_name": "Zernio",
                "message": "Zernio API key is empty. Configure it in Settings & Wizard."
            }
        try:
            posts = get_zernio_posts(zernio_key, status_filter=status_filter)
            return {
                "posts": posts,
                "provider": "zernio",
                "provider_name": "Zernio",
                "total": len(posts)
            }
        except ValueError as e:
            if "401" in str(e) or "unauthorized" in str(e).lower():
                raise HTTPException(status_code=401, detail="Zernio API Key is invalid or unauthorized. Please verify in Settings.")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            return {
                "posts": [],
                "provider": "zernio",
                "provider_name": "Zernio",
                "error": str(e)
            }

    # 3. YOUTUBE DIRECT ONLY MODE
    elif provider == "youtube_direct":
        yt_posts = get_scheduled_youtube_videos(filter_status=status_filter)
        return {
            "posts": yt_posts,
            "provider": "youtube_direct",
            "provider_name": "YouTube Studio Scheduled",
            "total": len(yt_posts)
        }

    # 4. WOOPSOCIAL (LEGACY)
    elif provider == "woopsocial":
        woop_key = cfg.get("woopsocial_api_key", "").strip()
        if not woop_key:
            return {
                "posts": [],
                "provider": "woopsocial",
                "provider_name": "WoopSocial",
                "message": "WoopSocial API key is empty. Configure it in Settings & Wizard."
            }
        try:
            posts = get_social_account_posts(woop_key, status_filter=status_filter)
            return {
                "posts": posts,
                "provider": "woopsocial",
                "provider_name": "WoopSocial",
                "total": len(posts)
            }
        except Exception as e:
            err_str = str(e)
            if "401" in err_str or "unauthorized" in err_str.lower():
                raise HTTPException(status_code=401, detail="WoopSocial API Key is unauthorized. Please verify in Settings.")
            raise HTTPException(status_code=500, detail=err_str)

    # 5. LOCAL ONLY
    return {
        "posts": [],
        "provider": "local_only",
        "provider_name": "Local Export",
        "message": "Connected in Local Mode. Clips are saved to exports/local/<creator>/."
    }


@router.post("/retry/{post_id}")
def retry_queue_post(post_id: str):
    """Retries a failed post with the active provider."""
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

    raise HTTPException(status_code=400, detail="No active provider available to retry post")


@router.delete("/posts/{post_id}")
def delete_queue_post(post_id: str):
    """Deletes or cancels a post from YouTube Studio or Zernio."""
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
