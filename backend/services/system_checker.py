"""system_checker.py - Automated System & Dependency Diagnostics
Verifies ffmpeg, ffprobe, yt-dlp, Python packages, and free disk space.
Supports smart binary path resolution and 1-click binary installation.
"""

import sys
import shutil
import logging
import subprocess
import importlib.util
from pathlib import Path
from typing import Dict, Any, List

from backend.bin_resolver import resolve_binary, BACKEND_BIN, inject_binaries_into_path

logger = logging.getLogger("syntaxclipper.system_checker")
SUBPROCESS_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

PYTHON_PACKAGES_TO_CHECK = [
    {"name": "fastapi", "pip": "fastapi"},
    {"name": "uvicorn", "pip": "uvicorn"},
    {"name": "cv2", "pip": "opencv-python"},
    {"name": "faster_whisper", "pip": "faster-whisper"},
    {"name": "psutil", "pip": "psutil"},
    {"name": "google_auth_oauthlib", "pip": "google-auth-oauthlib"},
    {"name": "googleapiclient", "pip": "google-api-python-client"},
    {"name": "requests", "pip": "requests"},
    {"name": "numpy", "pip": "numpy"},
    {"name": "unidecode", "pip": "unidecode"},
]


def check_tool(executable: str) -> Dict[str, Any]:
    """Checks if a CLI binary exists (using smart bin_resolver) and is executable."""
    path = resolve_binary(executable)
    if not path:
        return {"installed": False, "version": None, "path": None}

    version = "Ready"
    try:
        cmd = [path, "--version"] if "yt" in executable.lower() else [path, "-version"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5, creationflags=SUBPROCESS_FLAGS)
        first_line = (res.stdout or res.stderr).strip().splitlines()[0]
        version = first_line[:50]
    except Exception:
        version = "Ready"

    return {"installed": True, "version": version, "path": path}


def check_python_package(name: str, pip_name: str) -> Dict[str, Any]:
    """Checks if a Python module is importable."""
    spec = importlib.util.find_spec(name)
    installed = spec is not None
    version = None
    if installed:
        try:
            mod = importlib.import_module(name)
            version = getattr(mod, "__version__", "Installed")
        except Exception:
            version = "Installed"
    return {"name": name, "pip": pip_name, "installed": installed, "version": str(version) if version else None}


def run_system_check() -> Dict[str, Any]:
    """Runs a complete system health and dependency check.
    Returns both 'binaries' and 'tools' keys for full backward and frontend compatibility.
    """
    tools = {
        "ffmpeg": check_tool("ffmpeg"),
        "ffprobe": check_tool("ffprobe"),
        "yt_dlp": check_tool("yt-dlp"),
    }

    packages = [check_python_package(p["name"], p["pip"]) for p in PYTHON_PACKAGES_TO_CHECK]

    # Check free disk space
    free_gb = 0.0
    total_gb = 0.0
    try:
        usage = shutil.disk_usage(".")
        free_gb = round(usage.free / (1024 ** 3), 1)
        total_gb = round(usage.total / (1024 ** 3), 1)
    except Exception:
        pass

    all_tools_ok = all(t["installed"] for t in tools.values())
    all_packages_ok = all(p["installed"] for p in packages)
    all_ok = all_tools_ok and all_packages_ok

    return {
        "all_ok": all_ok,
        "binaries_ok": all_tools_ok,
        "packages_ok": all_packages_ok,
        "binaries": tools,
        "tools": tools,
        "packages": packages,
        "disk": {
            "free_gb": free_gb,
            "total_gb": total_gb,
            "sufficient": free_gb >= 5.0
        },
        "storage": {
            "free_gb": free_gb,
            "total_gb": total_gb,
            "sufficient": free_gb >= 5.0
        },
        "python_version": sys.version.split()[0],
        "platform": sys.platform
    }


def auto_install_missing_packages() -> Dict[str, Any]:
    """Installs any missing Python dependencies via pip."""
    missing = []
    for p in PYTHON_PACKAGES_TO_CHECK:
        if not importlib.util.find_spec(p["name"]):
            missing.append(p["pip"])

    if not missing:
        return {"success": True, "message": "All dependencies are already installed.", "installed": []}

    try:
        cmd = [sys.executable, "-m", "pip", "install"] + missing
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=180, creationflags=SUBPROCESS_FLAGS)
        if res.returncode == 0:
            return {"success": True, "message": f"Successfully installed: {', '.join(missing)}", "installed": missing}
        else:
            return {"success": False, "message": f"Pip install error: {res.stderr[:300]}", "installed": []}
    except Exception as e:
        return {"success": False, "message": str(e), "installed": []}


def auto_install_missing_binaries() -> Dict[str, Any]:
    """1-Click automated installer for ffmpeg, ffprobe, and yt-dlp.
    1. Installs/updates yt-dlp via pip.
    2. Downloads official Windows x64 ffmpeg essentials and extracts ffmpeg.exe & ffprobe.exe into backend/bin/.
    3. Re-injects PATH and returns fresh system check.
    """
    installed_items = []
    errors = []

    # 1. yt-dlp
    if not resolve_binary("yt-dlp"):
        try:
            logger.info("Installing yt-dlp into Python environment...")
            cmd = [sys.executable, "-m", "pip", "install", "-U", "yt-dlp"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120, creationflags=SUBPROCESS_FLAGS)
            if res.returncode == 0:
                installed_items.append("yt-dlp")
            else:
                errors.append(f"yt-dlp install failed: {res.stderr[:200]}")
        except Exception as e:
            errors.append(f"yt-dlp install error: {str(e)}")

    # 2. ffmpeg & ffprobe
    need_ffmpeg = not resolve_binary("ffmpeg")
    need_ffprobe = not resolve_binary("ffprobe")
    if need_ffmpeg or need_ffprobe:
        BACKEND_BIN.mkdir(parents=True, exist_ok=True)
        temp_zip = BACKEND_BIN / "ffmpeg_download.zip"
        download_urls = [
            "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
            "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
        ]

        download_success = False
        import urllib.request
        import zipfile

        for url in download_urls:
            try:
                logger.info(f"Downloading ffmpeg essentials from {url}...")
                req = urllib.request.Request(url, headers={"User-Agent": "SyntaxClipper-Installer/1.1"})
                with urllib.request.urlopen(req, timeout=180) as resp, open(temp_zip, "wb") as out_f:
                    shutil.copyfileobj(resp, out_f)
                download_success = True
                break
            except Exception as e:
                logger.warning(f"Download from {url} failed: {e}")

        if download_success and temp_zip.exists():
            try:
                logger.info("Extracting ffmpeg.exe and ffprobe.exe into backend/bin/...")
                with zipfile.ZipFile(temp_zip, "r") as zf:
                    for name in zf.namelist():
                        norm_name = name.lower()
                        if norm_name.endswith("ffmpeg.exe"):
                            with zf.open(name) as src, open(BACKEND_BIN / "ffmpeg.exe", "wb") as dst:
                                shutil.copyfileobj(src, dst)
                                installed_items.append("ffmpeg.exe")
                        elif norm_name.endswith("ffprobe.exe"):
                            with zf.open(name) as src, open(BACKEND_BIN / "ffprobe.exe", "wb") as dst:
                                shutil.copyfileobj(src, dst)
                                installed_items.append("ffprobe.exe")
            except Exception as e:
                errors.append(f"Extraction error: {str(e)}")
            finally:
                temp_zip.unlink(missing_ok=True)
        elif not download_success:
            errors.append("Failed to download ffmpeg archive from mirror sites.")

    # Re-inject PATH
    inject_binaries_into_path()
    fresh_check = run_system_check()

    return {
        "success": fresh_check.get("binaries_ok", False) or len(installed_items) > 0,
        "installed": installed_items,
        "errors": errors,
        "message": f"Successfully verified/installed: {', '.join(installed_items)}" if installed_items else "All binaries are ready.",
        "system": fresh_check
    }
