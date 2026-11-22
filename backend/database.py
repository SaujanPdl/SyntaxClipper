"""database.py - Local JSON store for Creators, Games, and History
Provides CRUD operations and round-robin scheduling state.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_FILE = ROOT_DIR / "library_data.json"

DEFAULT_CREATORS = [
    {
        "id": "creator_bbs",
        "name": "BeastBoyShub",
        "handle": "@BeastBoyShub",
        "channel_url": "https://www.youtube.com/@BeastBoyShub",
        "search_query": 'ytsearch10:"BeastBoyShub GTA 6"',
        "facecam_mode": "split",  # "auto", "split", "fullscreen"
        "destination_mode": "woopsocial",  # "woopsocial", "local_only"
        "facecam_only": True,
        "max_clips_per_day": 2,
        "enabled": True,
    },
    {
        "id": "creator_ishowspeed",
        "name": "IShowSpeed",
        "handle": "@IShowSpeed",
        "channel_url": "https://www.youtube.com/@IShowSpeed",
        "search_query": 'ytsearch10:"IShowSpeed GTA 6"',
        "facecam_mode": "split",
        "destination_mode": "woopsocial",
        "facecam_only": True,
        "max_clips_per_day": 2,
        "enabled": True,
    },
    {
        "id": "creator_caseoh",
        "name": "CaseOh",
        "handle": "@CaseOh",
        "channel_url": "https://www.youtube.com/@CaseOh",
        "search_query": 'ytsearch10:"CaseOh GTA 6"',
        "facecam_mode": "split",
        "destination_mode": "woopsocial",
        "facecam_only": True,
        "max_clips_per_day": 2,
        "enabled": True,
    },
    {
        "id": "creator_kaicenat",
        "name": "Kai Cenat",
        "handle": "@KaiCenat",
        "channel_url": "https://www.youtube.com/@KaiCenat",
        "search_query": 'ytsearch10:"Kai Cenat GTA 6"',
        "facecam_mode": "split",
        "destination_mode": "woopsocial",
        "facecam_only": True,
        "max_clips_per_day": 2,
        "enabled": True,
    },
    {
        "id": "creator_jynxzi",
        "name": "Jynxzi",
        "handle": "@Jynxzi",
        "channel_url": "https://www.youtube.com/@Jynxzi",
        "search_query": 'ytsearch10:"Jynxzi GTA 6"',
        "facecam_mode": "split",
        "destination_mode": "woopsocial",
        "facecam_only": True,
        "max_clips_per_day": 2,
        "enabled": True,
    },
    {
        "id": "creator_xqc",
        "name": "xQc",
        "handle": "@xQcOW",
        "channel_url": "https://www.youtube.com/@xQcOW",
        "search_query": 'ytsearch10:"xQc GTA 6"',
        "facecam_mode": "split",
        "destination_mode": "woopsocial",
        "facecam_only": True,
        "max_clips_per_day": 2,
        "enabled": True,
    }
]

DEFAULT_GAMES = [
    {
        "id": "game_gta6",
        "name": "GTA 6",
        "query": "GTA 6 live stream gameplay facecam",
        "min_duration_minutes": 30,
        "upload_date_filter": "last_14_days",
        "hashtags": "#gta6 #gtavi #gaming #rockstargames #shorts #viral",
        "enabled": True,
    },
    {
        "id": "game_valorant",
        "name": "Valorant",
        "query": "Valorant radiant ranked clutch facecam",
        "min_duration_minutes": 25,
        "upload_date_filter": "last_14_days",
        "hashtags": "#valorant #radiant #clutch #gaming #shorts",
        "enabled": True,
    },
    {
        "id": "game_minecraft",
        "name": "Minecraft",
        "query": "Minecraft hardcore survival livestream facecam",
        "min_duration_minutes": 30,
        "upload_date_filter": "last_30_days",
        "hashtags": "#minecraft #hardcore #gaming #survival #shorts",
        "enabled": True,
    },
    {
        "id": "game_fortnite",
        "name": "Fortnite",
        "query": "Fortnite tournament victory royale facecam",
        "min_duration_minutes": 20,
        "upload_date_filter": "last_14_days",
        "hashtags": "#fortnite #gaming #victoryroyale #shorts",
        "enabled": True,
    },
    {
        "id": "game_cs2",
        "name": "Counter-Strike 2",
        "query": "CS2 premier ace clutch live facecam",
        "min_duration_minutes": 25,
        "upload_date_filter": "last_14_days",
        "hashtags": "#cs2 #counterstrike #ace #gaming #shorts",
        "enabled": True,
    }
]


def load_db() -> Dict[str, Any]:
    """Loads database file or initializes with sensible defaults."""
    if DB_FILE.exists():
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "creators" in data and "games" in data:
                    # Migrate fields if missing
                    updated = False
                    for c in data.get("creators", []):
                        if "facecam_mode" not in c:
                            c["facecam_mode"] = "split" if c.get("facecam_only", True) else "auto"
                            updated = True
                        if "destination_mode" not in c:
                            c["destination_mode"] = "woopsocial"
                            updated = True
                    if updated:
                        save_db(data)
                    return data
        except Exception:
            pass

    initial_data = {
        "creators": DEFAULT_CREATORS,
        "games": DEFAULT_GAMES,
        "round_robin_creator_idx": 0,
        "round_robin_game_idx": 0,
        "daily_creator_counts": {},
        "last_count_reset_date": "",
    }
    save_db(initial_data)
    return initial_data


def save_db(data: Dict[str, Any]) -> None:
    """Atomic save for database file."""
    tmp = DB_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    tmp.replace(DB_FILE)


def get_creators() -> List[Dict[str, Any]]:
    return load_db().get("creators", [])


def add_creator(creator: Dict[str, Any]) -> Dict[str, Any]:
    db = load_db()
    creators = db.get("creators", [])
    if not creator.get("id"):
        creator["id"] = f"creator_{len(creators) + 1}_{int(Path(DB_FILE).stat().st_mtime if DB_FILE.exists() else 0)}"
    creators.append(creator)
    db["creators"] = creators
    save_db(db)
    return creator


def update_creator(creator_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = load_db()
    for idx, c in enumerate(db.get("creators", [])):
        if c.get("id") == creator_id:
            c.update(updates)
            db["creators"][idx] = c
            save_db(db)
            return c
    return None


def delete_creator(creator_id: str) -> bool:
    db = load_db()
    original_len = len(db.get("creators", []))
    db["creators"] = [c for c in db.get("creators", []) if c.get("id") != creator_id]
    if len(db["creators"]) != original_len:
        save_db(db)
        return True
    return False


def get_games() -> List[Dict[str, Any]]:
    return load_db().get("games", [])


def add_game(game: Dict[str, Any]) -> Dict[str, Any]:
    db = load_db()
    games = db.get("games", [])
    if not game.get("id"):
        game["id"] = f"game_{len(games) + 1}"
    games.append(game)
    db["games"] = games
    save_db(db)
    return game


def update_game(game_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = load_db()
    for idx, g in enumerate(db.get("games", [])):
        if g.get("id") == game_id:
            g.update(updates)
            db["games"][idx] = g
            save_db(db)
            return g
    return None


def delete_game(game_id: str) -> bool:
    db = load_db()
    original_len = len(db.get("games", []))
    db["games"] = [g for g in db.get("games", []) if g.get("id") != game_id]
    if len(db["games"]) != original_len:
        save_db(db)
        return True
    return False


def get_next_round_robin_target() -> Dict[str, Any]:
    """Selects the next enabled Creator and Game based on round-robin pointers."""
    db = load_db()
    enabled_creators = [c for c in db.get("creators", []) if c.get("enabled", True)]
    enabled_games = [g for g in db.get("games", []) if g.get("enabled", True)]

    creator = None
    if enabled_creators:
        c_idx = db.get("round_robin_creator_idx", 0) % len(enabled_creators)
        creator = enabled_creators[c_idx]
        db["round_robin_creator_idx"] = (c_idx + 1) % len(enabled_creators)

    game = None
    if enabled_games:
        g_idx = db.get("round_robin_game_idx", 0) % len(enabled_games)
        game = enabled_games[g_idx]
        db["round_robin_game_idx"] = (g_idx + 1) % len(enabled_games)

    save_db(db)
    return {"creator": creator, "game": game}
