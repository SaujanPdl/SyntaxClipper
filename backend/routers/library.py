from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from backend.database import (
    get_creators,
    add_creator,
    update_creator,
    delete_creator,
    get_games,
    add_game,
    update_game,
    delete_game
)
from backend.config import get_config, save_config

router = APIRouter(prefix="/api/library", tags=["library"])


class CreatorModel(BaseModel):
    id: Optional[str] = None
    name: str
    handle: Optional[str] = ""
    channel_url: Optional[str] = ""
    search_query: Optional[str] = ""
    facecam_mode: Optional[str] = "auto"       # "auto", "split", "fullscreen"
    destination_mode: Optional[str] = "woopsocial" # "woopsocial", "local_only"
    facecam_only: Optional[bool] = True
    max_clips_per_day: Optional[int] = 2
    enabled: Optional[bool] = True


class GameModel(BaseModel):
    id: Optional[str] = None
    name: str
    query: str
    min_duration_minutes: Optional[int] = 25
    upload_date_filter: Optional[str] = "last_14_days"
    hashtags: Optional[str] = "#gaming #shorts #viral"
    enabled: Optional[bool] = True


class SettingsModel(BaseModel):
    round_robin_enabled: bool


@router.get("/creators")
def list_creators():
    return {"creators": get_creators()}


@router.post("/creators")
def create_creator(creator: CreatorModel):
    created = add_creator(creator.model_dump())
    return created


@router.put("/creators/{creator_id}")
def edit_creator(creator_id: str, updates: CreatorModel):
    res = update_creator(creator_id, updates.model_dump(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Creator not found")
    return res


@router.delete("/creators/{creator_id}")
def remove_creator(creator_id: str):
    success = delete_creator(creator_id)
    if not success:
        raise HTTPException(status_code=404, detail="Creator not found")
    return {"success": True}


@router.get("/games")
def list_games():
    return {"games": get_games()}


@router.post("/games")
def create_game(game: GameModel):
    created = add_game(game.model_dump())
    return created


@router.put("/games/{game_id}")
def edit_game(game_id: str, updates: GameModel):
    res = update_game(game_id, updates.model_dump(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Game not found")
    return res


@router.delete("/games/{game_id}")
def remove_game(game_id: str):
    success = delete_game(game_id)
    if not success:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"success": True}


@router.post("/round-robin")
def toggle_round_robin(body: SettingsModel):
    cfg = get_config()
    pref = cfg.get("preferences", {})
    pref["round_robin_enabled"] = body.round_robin_enabled
    save_config({"preferences": pref})
    return {"round_robin_enabled": body.round_robin_enabled}
