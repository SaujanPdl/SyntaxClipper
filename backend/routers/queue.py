"""queue.py - Dynamic Multi-Provider Queue and Post Management Router
Supports Zernio REST API, WoopSocial REST API, and Local/Direct buffers.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any, List
from backend.config import get_config, get_active_provider
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
    """Dynamically routes post queue retrieval based on active provider.
    When Zernio is active, queries GET https://zernio.com/api/v1/posts with Authorization: Bearer <ZERNIO_API_KEY>.
    When WoopSocial is active, queries WoopSocial social account posts.
    """
    cfg = get_config()
    active_info = get_active_provider(cfg)
    provider = active_info.get("provider", "hybrid")
    status_filter = (status or "ALL").upper()

    # Provider: Zernio
    if provider == "zernio" or (provider == "hybrid" and cfg.get("zernio_api_key")):
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

    # Provider: WoopSocial
    if provider == "woopsocial" or (provider == "hybrid" and cfg.get("woopsocial_api_key")):
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

    # Provider: Local or Direct YouTube without social queue
    return {
        "posts": [],
        "provider": provider,
        "provider_name": active_info.get("name", "Local/Direct"),
        "message": "Connected in Local / Direct YouTube mode. Queue is managed on local storage."
    }


@router.post("/retry/{post_id}")
def retry_queue_post(post_id: str):
    """Retries a failed post with the active provider."""
    cfg = get_config()
    active_info = get_active_provider(cfg)
    provider = active_info.get("provider", "hybrid")

    if provider == "zernio" or (provider == "hybrid" and cfg.get("zernio_api_key")):
        zernio_key = cfg.get("zernio_api_key", "").strip()
        if not zernio_key:
            raise HTTPException(status_code=400, detail="Zernio API Key not configured")
        res = retry_zernio_post(zernio_key, post_id)
        return res

    woop_key = cfg.get("woopsocial_api_key", "").strip()
    if not woop_key:
        raise HTTPException(status_code=400, detail="No active social publishing provider configured")
    try:
        res = retry_failed_post(woop_key, post_id)
        return {"success": True, "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/{post_id}")
def delete_queue_post(post_id: str):
    """Deletes or cancels a post with the active provider."""
    cfg = get_config()
    active_info = get_active_provider(cfg)
    provider = active_info.get("provider", "hybrid")

    if provider == "zernio" or (provider == "hybrid" and cfg.get("zernio_api_key")):
        zernio_key = cfg.get("zernio_api_key", "").strip()
        if not zernio_key:
            raise HTTPException(status_code=400, detail="Zernio API Key not configured")
        res = delete_zernio_post(zernio_key, post_id)
        return res

    woop_key = cfg.get("woopsocial_api_key", "").strip()
    if not woop_key:
        raise HTTPException(status_code=400, detail="No active social publishing provider configured")
    try:
        res = delete_social_post(woop_key, post_id)
        return {"success": True, "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
