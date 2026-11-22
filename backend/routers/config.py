from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.config import get_config, save_config

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdateModel(BaseModel):
    first_run_completed: Optional[bool] = None
    woopsocial_api_key: Optional[str] = None
    selected_project_id: Optional[str] = None
    selected_social_accounts: Optional[list] = None
    preferences: Optional[Dict[str, Any]] = None


@router.get("")
def read_config():
    return get_config()


@router.post("")
def update_config(payload: ConfigUpdateModel):
    data = payload.model_dump(exclude_unset=True)
    return save_config(data)
