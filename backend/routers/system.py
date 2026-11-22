"""system.py - System Diagnostics & Update Router
Branded for SyntaxClipper by Syntax Nepal.
"""

from fastapi import APIRouter
from backend.services.system_checker import (
    run_system_check,
    auto_install_missing_packages,
    auto_install_missing_binaries
)
from backend.updater import check_for_updates, apply_update_and_restart, get_local_version_info

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/check")
def get_system_status():
    return run_system_check()


@router.post("/install-missing")
def install_missing():
    return auto_install_missing_packages()


@router.post("/install-binaries")
def install_binaries():
    """1-Click auto-install for ffmpeg, ffprobe, and yt-dlp."""
    return auto_install_missing_binaries()


@router.get("/version")
def get_version():
    """Returns local version metadata."""
    return get_local_version_info()


@router.get("/check-update")
def check_update():
    """Queries GitHub for new releases or main commits."""
    return check_for_updates()


@router.post("/apply-update")
def apply_update():
    """Backs up user configurations, pulls/downloads update, and restarts SyntaxClipper."""
    return apply_update_and_restart()
