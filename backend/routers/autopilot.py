from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

from backend.services.autopilot_manager import autopilot_service
from backend.autopilot import (
    install_windows_task,
    uninstall_windows_task,
    is_windows_task_installed,
    get_platform_quota_usage,
    read_status_file
)
from backend.game_detector import detect_game_and_performance_state
from backend.config import LOGS_DIR, get_config, save_config

router = APIRouter(prefix="/api/autopilot", tags=["autopilot"])
WATCHDOG_LOG = LOGS_DIR / "watchdog.log"


class ExceptionsRequest(BaseModel):
    always_pause_exes: Optional[List[str]] = None
    never_pause_exes: Optional[List[str]] = None


class AutopilotToggleRequest(BaseModel):
    enabled: bool


@router.get("/status")
def get_autopilot_status():
    status_data = autopilot_service.get_status()
    # 4-Layer Universal Game & Performance State
    perf = detect_game_and_performance_state()
    status_data["performance_mode"] = perf["mode"]
    status_data["performance_label"] = perf["label"]
    status_data["detected_game"] = perf["detected_game"]
    status_data["detection_layer"] = perf["detection_layer"]
    status_data["idle_seconds"] = perf["idle_seconds"]
    status_data["cpu_usage"] = perf["cpu_usage"]
    status_data["has_nvenc"] = perf.get("has_nvenc", False)

    if perf["is_gaming"]:
        status_data["detected_game"] = perf["detected_game"]
        status_data["status"] = "PAUSED_GAME_MODE"
        status_data["current_action"] = perf["label"]
    elif not status_data.get("is_running"):
        status_data["current_action"] = perf["label"]

    cfg = get_config()
    task_installed = is_windows_task_installed()
    autopilot_enabled = bool(cfg.get("autopilot_enabled", False))
    if "autopilot_enabled" not in cfg:
        autopilot_enabled = bool(status_data.get("is_running", False))

    status_data["autopilot_enabled"] = autopilot_enabled
    status_data["task_installed"] = task_installed
    status_data["task_registered"] = task_installed
    status_data["quotas"] = get_platform_quota_usage()
    return status_data


@router.post("/toggle")
def toggle_autopilot_endpoint(req: AutopilotToggleRequest):
    """Toggles autopilot on/off: persists to config.json and syncs Windows Task Scheduler."""
    save_config({"autopilot_enabled": req.enabled})

    if req.enabled:
        task_res = install_windows_task()
        loop_res = autopilot_service.start()
        task_registered = is_windows_task_installed()
        return {
            "success": True,
            "autopilot_enabled": True,
            "task_registered": task_registered,
            "message": "Autopilot Activated (Background Scheduler Running)",
            "task_result": task_res,
            "service_result": loop_res
        }
    else:
        task_res = uninstall_windows_task()
        loop_res = autopilot_service.stop()
        task_registered = is_windows_task_installed()
        return {
            "success": True,
            "autopilot_enabled": False,
            "task_registered": task_registered,
            "message": "Autopilot Paused",
            "task_result": task_res,
            "service_result": loop_res
        }


@router.get("/performance")
def get_performance_diagnostics():
    """Live 4-Layer Game Detection & 3-Tier Performance Diagnostics."""
    return detect_game_and_performance_state(force_refresh=True)


@router.post("/exceptions")
def update_game_exceptions(req: ExceptionsRequest):
    """Updates custom user exceptions for game detection."""
    updates = {}
    if req.always_pause_exes is not None:
        updates["always_pause_exes"] = req.always_pause_exes
    if req.never_pause_exes is not None:
        updates["never_pause_exes"] = req.never_pause_exes
    saved = save_config(updates)
    return {"success": True, "config": saved}


@router.post("/start")
def start_autopilot():
    save_config({"autopilot_enabled": True})
    install_windows_task()
    return autopilot_service.start()


@router.post("/stop")
def stop_autopilot():
    save_config({"autopilot_enabled": False})
    uninstall_windows_task()
    return autopilot_service.stop()


@router.post("/task/install")
def install_task():
    return install_windows_task()


@router.post("/task/uninstall")
def uninstall_task():
    return uninstall_windows_task()


@router.get("/quotas")
def get_quotas():
    return get_platform_quota_usage()


@router.get("/logs")
def get_autopilot_logs(limit: int = 50):
    lines = []
    if WATCHDOG_LOG.exists():
        try:
            with open(WATCHDOG_LOG, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception:
            pass
    return {"logs": [l.strip() for l in lines[-limit:]]}
