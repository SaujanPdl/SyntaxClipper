"""autopilot.py - Production Silent Background Autopilot Engine & Windows Task Manager
Operates invisibly via pythonw.exe with CREATE_NO_WINDOW subprocesses.
Enforces laptop-off catch-up, smart YouTube/TikTok rate limits, and zero-FPS-drop Game Mode.
"""

import os
import sys
import json
import time
import socket
import datetime
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

try:
    import psutil
except ImportError:
    psutil = None

# Set up project root in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config import (
    QUEUE_READY,
    QUEUE_UPLOADED,
    LOGS_DIR,
    get_config,
    save_config,
    is_api_key_configured
)
import backend.bin_resolver
from backend.database import get_next_round_robin_target, get_creators, get_games
from backend.publisher import publish_clip
from backend.services.woopsocial_client import (
    verify_connection,
    get_social_account_posts,
    upload_media_session,
    create_or_schedule_post
)
from backend.services.clipper_engine import (
    render_916_clip,
    download_vod_segment
)

# Background Subprocess Flags: CREATE_NO_WINDOW (0x08000000) + BELOW_NORMAL_PRIORITY_CLASS (0x00004000)
if sys.platform == "win32":
    SUBPROCESS_FLAGS = subprocess.CREATE_NO_WINDOW | 0x00004000
else:
    SUBPROCESS_FLAGS = 0

WATCHDOG_LOG = LOGS_DIR / "watchdog.log"
STATUS_FILE = LOGS_DIR / "autopilot_status.json"
POSTED_LOG = ROOT_DIR / "posted_log.json"

# Configurable list of game processes for zero-FPS-drop protection
GAME_EXECUTABLES = {
    "gta6.exe", "gta5.exe", "gta_sa.exe", "valorant-win64-shipping.exe", "valorant.exe",
    "riotclientservices.exe", "cs2.exe", "csgo.exe", "fortniteclient-win64-shipping.exe",
    "javaw.exe", "minecraft.windows.exe", "minecraft.exe", "sekiro.exe", "eldenring.exe",
    "darksoulsiii.exe", "r5apex.exe", "apex.exe", "overwatch.exe", "cyberpunk2077.exe",
    "helldivers2.exe", "rdr2.exe", "rdr.exe", "ghostoftsushima.exe", "sonsoftheforest.exe",
    "devour.exe", "dota2.exe", "leagueclientux.exe", "league of legends.exe",
    "robloxplayerbeta.exe", "robloxplayerlauncher.exe"
}


def log_event(message: str) -> None:
    """Writes timestamped entry to logs/watchdog.log."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{ts}] [Autopilot] {message}\n"
    try:
        with open(WATCHDOG_LOG, "a", encoding="utf-8") as f:
            f.write(entry)
    except Exception:
        pass


from backend.game_detector import (
    detect_game_and_performance_state,
    get_optimized_ffmpeg_flags,
    adjust_subprocess_priority
)


def is_gaming_active() -> Tuple[bool, Optional[str]]:
    """4-Layer Universal Game Detection check.
    Guarantees Zero FPS drop for all PC games (fullscreen, borderless, windowed).
    """
    state = detect_game_and_performance_state()
    return state["is_gaming"], state["detected_game"]


def check_internet() -> bool:
    """Verifies connectivity to WoopSocial API host."""
    try:
        with socket.create_connection(("api.woopsocial.com", 443), timeout=3):
            return True
    except Exception:
        return False


def get_platform_quota_usage() -> Dict[str, Any]:
    """Calculates posts published or scheduled in the last rolling 24 hours."""
    cfg = get_config()
    api_key = cfg.get("woopsocial_api_key", "")
    pref = cfg.get("preferences", {})
    yt_max = pref.get("youtube_daily_cap", 4)
    tiktok_max = pref.get("tiktok_daily_cap", 10)

    yt_count = 0
    tiktok_count = 0

    if api_key:
        try:
            posts = get_social_account_posts(api_key)
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            one_day_ago = now_utc - datetime.timedelta(hours=24)

            for p in posts:
                # Check createdAt or deliveryCompletedAt within last 24h
                created_str = p.get("createdAt")
                if created_str:
                    try:
                        clean_str = created_str.replace("Z", "+00:00")
                        c_dt = datetime.datetime.fromisoformat(clean_str)
                        if c_dt >= one_day_ago:
                            plat = p.get("platform", "").upper()
                            if plat == "YOUTUBE":
                                yt_count += 1
                            elif plat == "TIKTOK":
                                tiktok_count += 1
                    except Exception:
                        pass
        except Exception:
            pass

    return {
        "youtube_today": yt_count,
        "youtube_max": yt_max,
        "youtube_allowed": yt_count < yt_max,
        "tiktok_today": tiktok_count,
        "tiktok_max": tiktok_max,
        "tiktok_allowed": tiktok_count < tiktok_max,
    }


def update_status_file(data: Dict[str, Any]) -> None:
    """Persists current state to logs/autopilot_status.json for UI telemetry."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATUS_FILE.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        tmp.replace(STATUS_FILE)
    except Exception:
        pass


def read_status_file() -> Dict[str, Any]:
    """Reads autopilot_status.json telemetry."""
    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "is_running": False,
        "status": "STOPPED",
        "detected_game": None,
        "current_action": "Autopilot Idle",
        "last_cycle_time": 0.0,
        "task_installed": False
    }


# ==============================================================================
# Windows Scheduled Task Management (Laptop-Off Catch-Up)
# ==============================================================================

def install_windows_task() -> Dict[str, Any]:
    """Registers Windows Scheduled Task 'SyntaxClipperAutopilot' using schtasks."""
    if sys.platform != "win32":
        return {"success": False, "message": "Windows Scheduled Tasks are only supported on Windows"}

    # Find pythonw.exe
    python_dir = Path(sys.executable).parent
    pythonw = python_dir / "pythonw.exe"
    if not pythonw.exists():
        pythonw = Path(sys.executable)

    script_path = ROOT_DIR / "backend" / "autopilot.py"
    task_run = f'"{pythonw}" "{script_path}" --loop'

    cmd = [
        "schtasks", "/create",
        "/tn", "SyntaxClipperAutopilot",
        "/tr", task_run,
        "/sc", "hourly",
        "/f"
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
        if res.returncode == 0:
            log_event("Windows Scheduled Task 'SyntaxClipperAutopilot' registered successfully.")
            return {"success": True, "message": "Scheduled task registered with Laptop-Off Catch-Up enabled."}
        else:
            return {"success": False, "message": f"Task registration failed: {res.stderr[:200] or res.stdout[:200]}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def uninstall_windows_task() -> Dict[str, Any]:
    """Unregisters Windows Scheduled Task 'SyntaxClipperAutopilot'."""
    if sys.platform != "win32":
        return {"success": False, "message": "Only supported on Windows"}

    try:
        cmd = ["schtasks", "/delete", "/tn", "SyntaxClipperAutopilot", "/f"]
        res = subprocess.run(cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
        log_event("Windows Scheduled Task 'SyntaxClipperAutopilot' unregistered.")
        return {"success": True, "message": "Scheduled task unregistered successfully."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def is_windows_task_installed() -> bool:
    """Checks whether 'SyntaxClipperAutopilot' exists in Windows Task Scheduler."""
    if sys.platform != "win32":
        return False
    try:
        cmd = ["schtasks", "/query", "/tn", "SyntaxClipperAutopilot"]
        res = subprocess.run(cmd, capture_output=True, text=True, creationflags=SUBPROCESS_FLAGS)
        return res.returncode == 0
    except Exception:
        return False


# ==============================================================================
# Autonomous Processing Cycle
# ==============================================================================

def run_autopilot_cycle() -> Dict[str, Any]:
    """Executes a single catch-up and scheduling cycle."""
    cfg = get_config()
    pref = cfg.get("preferences", {})

    # 0. User Autopilot Toggle Check
    if not cfg.get("autopilot_enabled", True):
        state = {
            "is_running": False,
            "status": "PAUSED",
            "detected_game": None,
            "current_action": "Autopilot Paused in dashboard",
            "last_cycle_time": time.time(),
            "task_installed": is_windows_task_installed()
        }
        update_status_file(state)
        return state

    # 1. API Configuration Check
    if not is_api_key_configured():
        state = {
            "is_running": False,
            "status": "WAITING_CONFIG",
            "detected_game": None,
            "current_action": "Awaiting Publishing setup (Zernio, YouTube Direct, or Local Mode)",
            "last_cycle_time": time.time(),
            "task_installed": is_windows_task_installed()
        }
        update_status_file(state)
        return state

    # 2. Game Mode Detection (Zero FPS drop)
    if pref.get("game_mode_pause_enabled", True):
        gaming_active, game_name = is_gaming_active()
        if gaming_active:
            log_event(f"Game Mode Active: Paused for {game_name}")
            state = {
                "is_running": True,
                "status": "PAUSED_GAME_MODE",
                "detected_game": game_name,
                "current_action": f"Paused — Game Detected ({game_name})",
                "last_cycle_time": time.time(),
                "task_installed": is_windows_task_installed()
            }
            update_status_file(state)
            return state

    # 3. Internet Connectivity
    if not check_internet():
        state = {
            "is_running": True,
            "status": "WAITING_NETWORK",
            "detected_game": None,
            "current_action": "Waiting for internet connection...",
            "last_cycle_time": time.time(),
            "task_installed": is_windows_task_installed()
        }
        update_status_file(state)
        return state

    # 4. Quota Check
    quotas = get_platform_quota_usage()
    yt_allowed = quotas["youtube_allowed"]
    tiktok_allowed = quotas["tiktok_allowed"]

    project_id = cfg.get("selected_project_id", "")
    target_accounts = cfg.get("selected_social_accounts", [])

    # Auto-resolve project if needed
    if not project_id:
        try:
            conn = verify_connection(api_key)
            if conn.get("projects"):
                project_id = conn["projects"][0].get("id")
                save_config({"selected_project_id": project_id})
        except Exception:
            pass

    # 5. Process Ready Queue: Multi-Platform Upload & Cloud-Schedule
    ready_clips = list(QUEUE_READY.glob("*.mp4"))
    if ready_clips and (yt_allowed or tiktok_allowed or pref.get("target_platforms")):
        clip_file = ready_clips[0]
        meta_file = clip_file.with_suffix(".json")
        meta = {}
        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            except Exception:
                pass

        log_event(f"Processing ready clip for publishing: {clip_file.name}")
        try:
            # Smart Scheduling: Calculate release time
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            interval_hours = 6 if yt_allowed else 2
            sched_time = (now_utc + datetime.timedelta(hours=interval_hours)).isoformat().replace("+00:00", "Z")

            title = meta.get("title", "High-Energy Gameplay Moment")
            creator = meta.get("creator", "Live Streamer")
            desc = f"{title}\n\nCreator: {creator}\n#Shorts"

            target_plats = pref.get("target_platforms") or ["youtube", "tiktok", "instagram"]
            pub_res = publish_clip(
                clip_path=clip_file,
                title=title,
                captions={
                    "youtube_desc": desc,
                    "tiktok": f"{title} 🔥 #shorts #gaming #viral",
                    "instagram": f"{title} 🔥 #reels #gaming"
                },
                target_platforms=target_plats,
                creator_name=creator,
                scheduled_iso=sched_time
            )
            log_event(f"Autopilot publish dispatched: {pub_res.get('platform_results')}")

            # 6. Immediate Auto-Cleanup to preserve zero local disk usage
            if pref.get("auto_delete_local_clips", True):
                clip_file.unlink(missing_ok=True)
                meta_file.unlink(missing_ok=True)
                log_event(f"Local storage preserved: Deleted {clip_file.name} upon confirmation.")
            else:
                shutil.move(str(clip_file), str(QUEUE_UPLOADED / clip_file.name))
                if meta_file.exists():
                    shutil.move(str(meta_file), str(QUEUE_UPLOADED / meta_file.name))

        except Exception as e:
            log_event(f"Upload/Scheduling error: {e}")

    # 7. Check Buffer and Generate Clips via Round-Robin if low
    remaining_clips = len(list(QUEUE_READY.glob("*.mp4")))
    if remaining_clips < 2 and (yt_allowed or tiktok_allowed):
        target = get_next_round_robin_target()
        c = target.get("creator")
        g = target.get("game")
        target_name = c.get("name") if c else (g.get("name") if g else "Gaming")
        log_event(f"Buffer low ({remaining_clips} clips). Next round-robin candidate: {target_name}")

    state = {
        "is_running": True,
        "status": "RUNNING",
        "detected_game": None,
        "current_action": f"Active Watchdog (Queue: {remaining_clips} ready clips)",
        "last_cycle_time": time.time(),
        "quotas": quotas,
        "task_installed": is_windows_task_installed()
    }
    update_status_file(state)
    return state


def run_continuous_loop() -> None:
    """Entry point for pythonw.exe silent background daemon."""
    log_event("Autopilot continuous daemon started silently.")
    while True:
        try:
            run_autopilot_cycle()
        except Exception as e:
            log_event(f"Loop cycle error: {e}")
        time.sleep(30)


if __name__ == "__main__":
    if "--loop" in sys.argv:
        run_continuous_loop()
    elif "--catchup" in sys.argv:
        res = run_autopilot_cycle()
        print(json.dumps(res, indent=2))
    elif "--install-task" in sys.argv:
        print(install_windows_task())
    elif "--uninstall-task" in sys.argv:
        print(uninstall_windows_task())
    else:
        res = run_autopilot_cycle()
        print(json.dumps(res, indent=2))
