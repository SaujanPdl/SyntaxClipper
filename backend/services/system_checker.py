"""system_checker.py - Automated System & Dependency Diagnostics
Verifies ffmpeg, ffprobe, yt-dlp, Python packages, and free disk space.
"""

import sys
import shutil
import subprocess
import importlib.util
from typing import Dict, Any, List

SUBPROCESS_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

PYTHON_PACKAGES_TO_CHECK = [
    {"name": "fastapi", "pip": "fastapi"},
    {"name": "uvicorn", "pip": "uvicorn"},
    {"name": "cv2", "pip": "opencv-python"},
    {"name": "faster_whisper", "pip": "faster-whisper"},
    {"name": "psutil", "pip": "psutil"},
    {"name": "requests", "pip": "requests"},
    {"name": "numpy", "pip": "numpy"},
    {"name": "unidecode", "pip": "unidecode"},
]


def check_tool(executable: str) -> Dict[str, Any]:
    """Checks if a CLI binary exists in PATH and is executable."""
    path = shutil.which(executable)
    if not path:
        return {"installed": False, "version": None, "path": None}

    version = "Unknown"
    try:
        cmd = [path, "--version"] if executable == "yt-dlp" else [path, "-version"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5, creationflags=SUBPROCESS_FLAGS)
        first_line = (res.stdout or res.stderr).strip().splitlines()[0]
        version = first_line[:50]
    except Exception:
        version = "Installed (Version check timed out)"

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
    """Runs a complete system health and dependency check."""
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
        "tools": tools,
        "packages": packages,
        "disk": {
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
