"""autopilot_manager.py - Background Autopilot Watchdog Service
Controls autonomous clipping, Game-Mode pause detection via psutil,
round-robin rotation across creators/games, and WoopSocial queue synchronization.
"""

import os
import sys
import time
import json
import socket
import datetime
import threading
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

try:
    import psutil
except ImportError:
    psutil = None

from backend.config import ROOT_DIR, LOGS_DIR, QUEUE_READY, QUEUE_UPLOADED, get_config, save_config
from backend.database import get_next_round_robin_target, get_creators, get_games
from backend.services.woopsocial_client import (
    verify_connection,
    get_social_account_posts,
    upload_media_session,
    create_or_schedule_post
)

WATCHDOG_LOG = LOGS_DIR / "watchdog.log"
POSTED_LOG = ROOT_DIR / "posted_log.json"

# Monitored game processes
GAME_PROCESSES = {
    "valorant-win64-shipping.exe", "valorant.exe", "riotclientservices.exe",
    "sekiro.exe", "eldenring.exe", "darksoulsiii.exe", "javaw.exe",
    "minecraft.windows.exe", "minecraft.exe", "rdr.exe", "rdr2.exe",
    "gta5.exe", "gta_sa.exe", "ghostoftsushima.exe", "sonsoftheforest.exe",
    "devour.exe", "human.exe", "robloxplayerbeta.exe", "robloxplayerlauncher.exe",
    "cs2.exe", "csgo.exe", "dota2.exe", "leagueclientux.exe", "league of legends.exe",
    "fortniteclient-win64-shipping.exe", "overwatch.exe", "apex.exe", "r5apex.exe",
    "cyberpunk2077.exe", "helldivers2.exe"
}


class AutopilotService:
    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_running = False
        self._status = "STOPPED"  # "STOPPED", "IDLE", "RUNNING", "PAUSED_GAME_MODE"
        self._detected_game: Optional[str] = None
        self._current_action: str = "Ready"
        self._last_cycle_time: float = 0.0

    def log(self, message: str):
        """Appends timestamped entry to watchdog.log."""
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{ts}] [Autopilot] {message}\n"
        try:
            with open(WATCHDOG_LOG, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception:
            pass

    def check_game_mode(self) -> Optional[str]:
        """Checks if any registered gaming process is active."""
        if not psutil:
            return None
        try:
            for proc in psutil.process_iter(["name"]):
                name = proc.info.get("name")
                if name and name.lower() in GAME_PROCESSES:
                    return name
        except Exception:
            pass
        return None

    def check_internet(self) -> bool:
        """Verifies network connection to WoopSocial API."""
        try:
            with socket.create_connection(("api.woopsocial.com", 443), timeout=3):
                return True
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        """Returns live autopilot watchdog telemetry."""
        running_game = self.check_game_mode()
        status = "STOPPED"
        if self._is_running:
            if running_game:
                status = "PAUSED_GAME_MODE"
            else:
                status = self._status

        # Count ready queue
        ready_count = len(list(QUEUE_READY.glob("*.mp4")))
        uploaded_count = len(list(QUEUE_UPLOADED.glob("*.mp4")))

        return {
            "is_running": self._is_running,
            "status": status,
            "detected_game": running_game,
            "current_action": self._current_action,
            "last_cycle_time": self._last_cycle_time,
            "ready_queue_count": ready_count,
            "uploaded_queue_count": uploaded_count,
        }

    def start(self) -> Dict[str, Any]:
        """Starts the background watchdog thread."""
        cfg = get_config()
        if not cfg.get("woopsocial_api_key"):
            return {"success": False, "message": "WoopSocial API Key not configured. Please complete the Setup Wizard first."}

        if self._is_running:
            return {"success": True, "message": "Autopilot is already running."}

        self._stop_event.clear()
        self._is_running = True
        self._status = "RUNNING"
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        self.log("Autopilot Watchdog started.")
        return {"success": True, "message": "Autopilot Watchdog activated."}

    def stop(self) -> Dict[str, Any]:
        """Stops the background watchdog thread."""
        if not self._is_running:
            return {"success": True, "message": "Autopilot is not running."}

        self._stop_event.set()
        self._is_running = False
        self._status = "STOPPED"
        self._current_action = "Stopped by user"
        self.log("Autopilot Watchdog stopped by user.")
        return {"success": True, "message": "Autopilot Watchdog deactivated."}

    def _loop(self):
        """Main autonomous execution loop."""
        self.log("Watchdog background loop engaged.")
        while not self._stop_event.is_set():
            cfg = get_config()
            pref = cfg.get("preferences", {})

            # 1. Game-Mode Pause Protection
            if pref.get("game_mode_pause_enabled", True):
                game = self.check_game_mode()
                if game:
                    self._status = "PAUSED_GAME_MODE"
                    self._detected_game = game
                    self._current_action = f"Paused: Game detected ({game})"
                    self.log(f"Game Mode Active: Paused for {game}")
                    time.sleep(15)
                    continue
                else:
                    self._detected_game = None

            # 2. API Key Check
            api_key = cfg.get("woopsocial_api_key", "").strip()
            if not api_key:
                self._status = "WAITING_CONFIG"
                self._current_action = "Awaiting WoopSocial API Key setup in Wizard..."
                time.sleep(5)
                continue

            # 3. Connectivity Check
            if not self.check_internet():
                self._current_action = "Waiting for internet connectivity..."
                time.sleep(10)
                continue

            # 3. Check Ready Queue for Upload & Scheduling
            api_key = cfg.get("woopsocial_api_key", "")
            project_id = cfg.get("selected_project_id", "")
            target_accounts = cfg.get("selected_social_accounts", [])

            ready_clips = list(QUEUE_READY.glob("*.mp4"))
            if ready_clips and api_key and project_id and target_accounts:
                clip_file = ready_clips[0]
                meta_file = clip_file.with_suffix(".json")
                meta = {}
                if meta_file.exists():
                    try:
                        with open(meta_file, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                    except Exception:
                        pass

                self._current_action = f"Uploading {clip_file.name} to WoopSocial..."
                self.log(f"Starting WoopSocial upload for {clip_file.name}")
                try:
                    media_id = upload_media_session(api_key, project_id, clip_file)
                    self.log(f"Uploaded {clip_file.name} -> mediaId: {media_id}")

                    # Calculate schedule time
                    now_utc = datetime.datetime.now(datetime.timezone.utc)
                    hours_between = pref.get("posting_interval_hours", 2)
                    sched_time = (now_utc + datetime.timedelta(hours=hours_between)).isoformat().replace("+00:00", "Z")

                    title = meta.get("title", "High-Energy Gameplay Clip")
                    creator = meta.get("creator", "Creator")
                    desc = f"{title}\n\nCreator: {creator}\n#Shorts"

                    accounts_data = [{"id": acc_id} for acc_id in target_accounts]
                    post_res = create_or_schedule_post(
                        api_key=api_key,
                        project_id=project_id,
                        media_id=media_id,
                        title=title,
                        yt_description=desc,
                        tiktok_caption=desc,
                        account_targets=accounts_data,
                        scheduled_iso=sched_time
                    )
                    self.log(f"Successfully scheduled post {post_res.get('id', 'OK')} for {sched_time}")

                    # Auto-delete if preference enabled
                    if pref.get("auto_delete_local_clips", True):
                        clip_file.unlink(missing_ok=True)
                        meta_file.unlink(missing_ok=True)
                        self.log(f"[Storage] Auto-deleted local clip {clip_file.name} after scheduling.")
                    else:
                        # Move to uploaded archive
                        shutil.move(str(clip_file), str(QUEUE_UPLOADED / clip_file.name))
                        if meta_file.exists():
                            shutil.move(str(meta_file), str(QUEUE_UPLOADED / meta_file.name))

                except Exception as e:
                    self.log(f"Scheduling error: {e}")

            # 4. Check Buffer and Generate Clips if low
            ready_count = len(list(QUEUE_READY.glob("*.mp4")))
            if ready_count < 2:
                # Need buffer replenishment via round-robin
                target = get_next_round_robin_target()
                c = target.get("creator")
                g = target.get("game")
                target_name = c.get("name") if c else (g.get("name") if g else "Gaming")
                self._current_action = f"Buffer low ({ready_count}). Preparing round-robin target: {target_name}"
                self.log(f"Buffer low ({ready_count} clips). Target: {target_name}")

            self._last_cycle_time = time.time()
            self._status = "IDLE"
            self._current_action = f"Monitoring (Queue: {ready_count} ready clips)"

            # Sleep in small slices so stop_event is responsive
            for _ in range(30):
                if self._stop_event.is_set():
                    break
                time.sleep(1)


autopilot_service = AutopilotService()
