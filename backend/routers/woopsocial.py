from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.config import get_config, save_config
from backend.services.woopsocial_client import (
    verify_connection,
    get_social_account_posts,
    create_or_schedule_post,
    retry_failed_post,
    delete_social_post
)

router = APIRouter(prefix="/api/woopsocial", tags=["woopsocial"])


class VerifyRequest(BaseModel):
    api_key: str


class SchedulePostRequest(BaseModel):
    media_id: str
    title: str
    yt_description: str
    tiktok_caption: str
    scheduled_for_iso: Optional[str] = None  # None = publish now
    account_ids: Optional[List[str]] = None


@router.post("/verify")
def verify_api_key(req: VerifyRequest):
    res = verify_connection(req.api_key)
    if res.get("valid"):
        # Save key if valid
        save_config({"woopsocial_api_key": req.api_key})
    return res


@router.get("/accounts")
def list_accounts():
    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    if not api_key:
        return {"accounts": [], "projects": []}
    return verify_connection(api_key)


@router.get("/posts")
def list_posts(status: Optional[str] = None):
    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    if not api_key:
        return {"posts": []}
    try:
        posts = get_social_account_posts(api_key, status_filter=status)
        return {"posts": posts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retry/{post_id}")
def retry_post(post_id: str):
    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="WoopSocial API Key not configured")
    try:
        res = retry_failed_post(api_key, post_id)
        return {"success": True, "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/{post_id}")
def delete_post(post_id: str):
    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="WoopSocial API Key not configured")
    try:
        res = delete_social_post(api_key, post_id)
        return {"success": True, "result": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedule")
def schedule_post(req: SchedulePostRequest):
    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    project_id = cfg.get("selected_project_id", "")
    target_ids = req.account_ids or cfg.get("selected_social_accounts", [])

    if not api_key:
        raise HTTPException(status_code=400, detail="WoopSocial API key not set")
    if not project_id:
        # Auto-detect project if not saved
        conn = verify_connection(api_key)
        projects = conn.get("projects", [])
        if projects:
            project_id = projects[0].get("id")
            save_config({"selected_project_id": project_id})

    targets = [{"id": acc_id} for acc_id in target_ids]
    try:
        res = create_or_schedule_post(
            api_key=api_key,
            project_id=project_id,
            media_id=req.media_id,
            title=req.title,
            yt_description=req.yt_description,
            tiktok_caption=req.tiktok_caption,
            account_targets=targets,
            scheduled_iso=req.scheduled_for_iso
        )
        return {"success": True, "post": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
