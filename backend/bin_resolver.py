"""bin_resolver.py - Smart Binary Path Resolver
Resolves ffmpeg, ffprobe, and yt-dlp across local bundled paths, virtual environments,
WinGet links, Chocolatey, Scoop, and system PATH.
"""

import os
import sys
import shutil
import logging
from pathlib import Path
from typing import Optional, Dict

logger = logging.getLogger("syntaxclipper.bin_resolver")

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_BIN = ROOT_DIR / "backend" / "bin"
BACKEND_BIN.mkdir(parents=True, exist_ok=True)


def resolve_binary(name: str) -> Optional[str]:
    """Resolves absolute path to ffmpeg, ffprobe, or yt-dlp.
    Search order:
    1. Local backend/bin/<name>.exe
    2. sys.executable directory and Scripts subfolder (e.g. .venv/Scripts/yt-dlp.exe)
    3. shutil.which(name)
    4. Common Windows install locations (WinGet, Chocolatey, Scoop, C:\\ffmpeg\\bin)
    """
    clean_name = name.lower().replace("_", "-")
    exe_name = f"{clean_name}.exe" if sys.platform == "win32" and not clean_name.endswith(".exe") else clean_name

    # 1. Check local backend/bin/
    local_bin = BACKEND_BIN / exe_name
    if local_bin.exists() and os.access(local_bin, os.X_OK):
        return str(local_bin)

    # 2. Check sys.executable directory and Scripts folder
    py_dir = Path(sys.executable).resolve().parent
    candidates = [
        py_dir / exe_name,
        py_dir / "Scripts" / exe_name,
        py_dir.parent / "Scripts" / exe_name
    ]
    for c in candidates:
        if c.exists():
            return str(c)

    # 3. Check system PATH via shutil.which
    which_path = shutil.which(clean_name) or shutil.which(exe_name)
    if which_path:
        return str(Path(which_path).resolve())

    # 4. Check common Windows locations
    if sys.platform == "win32":
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        user_profile = os.environ.get("USERPROFILE", "")
        prog_data = os.environ.get("ProgramData", "C:\\ProgramData")

        common_dirs = [
            Path(local_app_data) / "Microsoft" / "WinGet" / "Links",
            Path("C:\\ffmpeg\\bin"),
            Path("C:\\ffmpeg"),
            Path(prog_data) / "chocolatey" / "bin",
            Path(user_profile) / "scoop" / "shims",
            Path(user_profile) / "AppData" / "Local" / "Programs" / "Python" / "Python312" / "Scripts",
            Path(user_profile) / "AppData" / "Local" / "Programs" / "Python" / "Python311" / "Scripts",
            Path(user_profile) / "AppData" / "Local" / "Programs" / "Python" / "Python310" / "Scripts",
        ]

        # Scan WinGet Packages folder if present
        winget_pkg = Path(local_app_data) / "Microsoft" / "WinGet" / "Packages"
        if winget_pkg.exists():
            try:
                for match in winget_pkg.glob(f"**/{exe_name}"):
                    if match.is_file():
                        return str(match.resolve())
            except Exception:
                pass

        for d in common_dirs:
            target = d / exe_name
            if target.exists():
                return str(target.resolve())

    return None


def get_binary_path_or_name(name: str) -> str:
    """Returns resolved absolute path or falls back to bare binary name."""
    resolved = resolve_binary(name)
    return resolved if resolved else name


def get_all_resolved_binaries() -> Dict[str, Optional[str]]:
    """Returns resolution map for all required media binaries."""
    return {
        "ffmpeg": resolve_binary("ffmpeg"),
        "ffprobe": resolve_binary("ffprobe"),
        "yt_dlp": resolve_binary("yt-dlp")
    }


def inject_binaries_into_path():
    """Prepends backend/bin and resolved binary folders into os.environ['PATH']."""
    paths_to_add = [str(BACKEND_BIN)]
    for _, path in get_all_resolved_binaries().items():
        if path:
            parent = str(Path(path).parent)
            if parent not in paths_to_add:
                paths_to_add.append(parent)

    current_path = os.environ.get("PATH", "")
    new_path = os.pathsep.join(paths_to_add + [current_path])
    os.environ["PATH"] = new_path


# Auto-inject on import
inject_binaries_into_path()
