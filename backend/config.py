"""config.py - SyntaxClipper Configuration Management
Reads and persists local config.json and multi-provider credentials.
Supports Zernio, WoopSocial, Upload-Post, Direct YouTube Data API v3, and Local Exports.
"""

import os
import json
import shutil
from pathlib import Path
from typing import Dict, Any, List

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT_DIR / "config.json"
CONFIG_EXAMPLE_PATH = ROOT_DIR / "config.example.json"
ENV_PATH = ROOT_DIR / ".env"
CLIENT_SECRET_PATH = ROOT_DIR / "client_secret.json"
YOUTUBE_TOKEN_PATH = ROOT_DIR / "youtube_token.json"

LOGS_DIR = ROOT_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
QUEUE_DIR = ROOT_DIR / "queue"
QUEUE_READY = QUEUE_DIR / "ready"
QUEUE_UPLOADED = QUEUE_DIR / "uploaded"
QUEUE_READY.mkdir(parents=True, exist_ok=True)
QUEUE_UPLOADED.mkdir(parents=True, exist_ok=True)
REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR = ROOT_DIR / "exports" / "local"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_CONFIG: Dict[str, Any] = {
    "first_run_completed": False,
    "publishing_mode": "hybrid",  # "hybrid", "zernio", "woopsocial", "youtube_direct", "local_only"
    "enabled_providers": ["youtube_direct", "zernio", "woopsocial", "local"],
    
    # Provider A: Zernio Unified API
    "zernio_api_key": "",
    "zernio_accounts": [],
    
    # Provider A alt: WoopSocial API
    "woopsocial_api_key": "",
    "selected_project_id": "",
    "selected_social_accounts": [],
    
    # Provider A alt: Upload-Post API
    "upload_post_api_key": "",
    
    # Provider B: Direct YouTube Data API v3 & OAuth
    "youtube_api_key": "",
    "youtube_oauth_configured": False,
    "youtube_channel_info": None,
    "youtube_default_privacy": "private",  # "public", "private", "unlisted"
    
    # Provider C: Local Only
    "local_export_enabled": True,

    "preferences": {
        "daily_post_limit": 10,
        "youtube_daily_cap": 10,
        "tiktok_daily_cap": 10,
        "reels_daily_cap": 10,
        "posting_interval_hours": 2,
        "date_filter_days": 14,
        "auto_delete_local_clips": True,
        "round_robin_enabled": True,
        "game_mode_pause_enabled": True,
        "default_layout": "fullscreen",
        "default_hook_style": "transparent",
        "default_caption_color": "yellow",
        "target_platforms": ["youtube", "tiktok", "instagram"]
    }
}


def ensure_config_exists() -> None:
    """If config.json does not exist, initialize from config.example.json or DEFAULT_CONFIG."""
    if not CONFIG_PATH.exists():
        if CONFIG_EXAMPLE_PATH.exists():
            try:
                shutil.copyfile(CONFIG_EXAMPLE_PATH, CONFIG_PATH)
                return
            except Exception:
                pass
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)


def load_env_key(key_name: str = "WOOPSOCIAL_API_KEY") -> str:
    """Reads environment key from os.environ or .env."""
    if key_name in os.environ and os.environ[key_name].strip():
        return os.environ[key_name].strip()
    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(f"{key_name}="):
                        val = line.split("=", 1)[1].strip().strip("'\"")
                        if val:
                            return val
        except Exception:
            pass
    return ""


def save_env_key(key_name: str, key_val: str) -> None:
    """Updates or appends a key in .env."""
    lines = []
    found = False
    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith(f"{key_name}="):
                        lines.append(f"{key_name}={key_val}\n")
                        found = True
                    else:
                        lines.append(line)
        except Exception:
            pass
    if not found:
        lines.append(f"{key_name}={key_val}\n")
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)
    os.environ[key_name] = key_val


def get_config() -> Dict[str, Any]:
    """Loads configuration with fallback defaults."""
    ensure_config_exists()
    cfg = dict(DEFAULT_CONFIG)
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
                cfg.update(saved)
                if "preferences" in saved:
                    merged_pref = dict(DEFAULT_CONFIG["preferences"])
                    merged_pref.update(saved["preferences"])
                    cfg["preferences"] = merged_pref
        except Exception:
            pass

    # Check .env for fallback keys
    woop_env = load_env_key("WOOPSOCIAL_API_KEY")
    if woop_env and not cfg.get("woopsocial_api_key"):
        cfg["woopsocial_api_key"] = woop_env

    zernio_env = load_env_key("ZERNIO_API_KEY")
    if zernio_env and not cfg.get("zernio_api_key"):
        cfg["zernio_api_key"] = zernio_env

    yt_env = load_env_key("YOUTUBE_API_KEY")
    if yt_env and not cfg.get("youtube_api_key"):
        cfg["youtube_api_key"] = yt_env

    # Sync YouTube oauth status
    cfg["youtube_oauth_configured"] = YOUTUBE_TOKEN_PATH.exists()

    return cfg


def is_api_key_configured() -> bool:
    """Checks whether any publishing provider or local mode is configured."""
    cfg = get_config()
    if cfg.get("woopsocial_api_key", "").strip():
        return True
    if cfg.get("zernio_api_key", "").strip():
        return True
    if cfg.get("upload_post_api_key", "").strip():
        return True
    if YOUTUBE_TOKEN_PATH.exists():
        return True
    if cfg.get("publishing_mode") == "local_only":
        return True
    return False


def save_config(updates: Dict[str, Any]) -> Dict[str, Any]:
    """Saves updated configuration to config.json and syncs .env."""
    ensure_config_exists()
    current = get_config()
    current.update(updates)
    if "preferences" in updates and isinstance(updates["preferences"], dict):
        merged_pref = dict(current.get("preferences", {}))
        merged_pref.update(updates["preferences"])
        current["preferences"] = merged_pref

    # Sync keys to .env
    if "woopsocial_api_key" in updates and updates["woopsocial_api_key"]:
        save_env_key("WOOPSOCIAL_API_KEY", updates["woopsocial_api_key"].strip())
    if "zernio_api_key" in updates and updates["zernio_api_key"]:
        save_env_key("ZERNIO_API_KEY", updates["zernio_api_key"].strip())
    if "youtube_api_key" in updates and updates["youtube_api_key"]:
        save_env_key("YOUTUBE_API_KEY", updates["youtube_api_key"].strip())

    tmp_path = CONFIG_PATH.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)
    tmp_path.replace(CONFIG_PATH)
    return current
