"""updater.py - Automatic GitHub Update Checker & 1-Click Updater
Branded for SyntaxClipper by Syntax Nepal.
Queries GitHub API (releases/latest or commits/main), compares local version/commit SHA,
backs up local user configurations, applies git fetch or zip download, and restarts the app.
"""

import os
import sys
import json
import shutil
import logging
import datetime
import zipfile
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("syntaxclipper.updater")
ROOT_DIR = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT_DIR / "version.json"
BACKUP_DIR = ROOT_DIR / "backup_config"

GITHUB_REPO = "SaujanPdl/SyntaxClipper"
GITHUB_API_BASE = f"https://api.github.com/repos/{GITHUB_REPO}"

USER_DATA_FILES = [
    "config.json",
    ".env",
    ".env.local",
    "library_data.json",
    "client_secret.json",
    "youtube_token.json",
    "posted_log.json",
    "strategy_weights.json"
]


def get_local_version_info() -> Dict[str, Any]:
    """Reads version.json from project root."""
    if VERSION_FILE.exists():
        try:
            with open(VERSION_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read version.json: {e}")

    # Fallback default
    return {
        "version": "1.1.0",
        "commit_sha": "",
        "github_repo": GITHUB_REPO,
        "brand": "SyntaxClipper by Syntax Nepal"
    }


def save_local_version_info(info: Dict[str, Any]):
    """Persists version.json to project root."""
    try:
        with open(VERSION_FILE, "w", encoding="utf-8") as f:
            json.dump(info, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save version.json: {e}")


def check_for_updates() -> Dict[str, Any]:
    """Queries GitHub's public API to detect new releases or commits.
    Returns:
        {
            "update_available": bool,
            "current_version": str,
            "latest_version": str,
            "changelog": str,
            "release_url": str,
            "commit_sha": str,
            "remote_sha": str,
            "checked_at": str
        }
    """
    local = get_local_version_info()
    current_version = local.get("version", "1.1.0")
    local_sha = local.get("commit_sha", "")

    headers = {
        "User-Agent": "SyntaxClipper-by-SyntaxNepal/1.1",
        "Accept": "application/vnd.github.v3+json"
    }

    # 1. Try GitHub formal release
    release_url = f"{GITHUB_API_BASE}/releases/latest"
    try:
        req = urllib.request.Request(release_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status == 200:
                rel_data = json.loads(r.read().decode("utf-8"))
                tag_name = rel_data.get("tag_name", "").lstrip("v")
                body = rel_data.get("body", "New release available on GitHub.")
                html_url = rel_data.get("html_url", f"https://github.com/{GITHUB_REPO}")

                update_available = (tag_name and tag_name != current_version)
                return {
                    "update_available": update_available,
                    "current_version": current_version,
                    "latest_version": f"v{tag_name}" if tag_name else "Latest Release",
                    "changelog": body,
                    "release_url": html_url,
                    "commit_sha": local_sha[:7] if local_sha else "",
                    "remote_sha": "",
                    "source": "github_release",
                    "checked_at": datetime.datetime.now().isoformat()
                }
    except urllib.error.HTTPError as e:
        if e.code != 404:
            logger.warning(f"GitHub release check returned HTTP {e.code}")
    except Exception as e:
        logger.warning(f"GitHub release check exception: {e}")

    # 2. Fallback to latest commit on main branch
    commit_url = f"{GITHUB_API_BASE}/commits/main"
    try:
        req = urllib.request.Request(commit_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as r:
            if r.status == 200:
                commit_data = json.loads(r.read().decode("utf-8"))
                remote_sha = commit_data.get("sha", "")
                commit_msg = commit_data.get("commit", {}).get("message", "")
                commit_html = commit_data.get("html_url", f"https://github.com/{GITHUB_REPO}/commits/main")

                # Update is available if remote commit differs from local commit
                update_available = False
                if remote_sha and local_sha:
                    update_available = (remote_sha != local_sha and not remote_sha.startswith(local_sha[:7]))

                clean_msg = commit_msg.strip() if commit_msg else "Latest enhancements and optimizations."
                return {
                    "update_available": update_available,
                    "current_version": current_version,
                    "latest_version": f"v{current_version} ({remote_sha[:7]})" if remote_sha else current_version,
                    "changelog": clean_msg,
                    "release_url": commit_html,
                    "commit_sha": local_sha[:7] if local_sha else "",
                    "remote_sha": remote_sha[:7] if remote_sha else "",
                    "source": "github_commits",
                    "checked_at": datetime.datetime.now().isoformat()
                }
    except Exception as e:
        logger.warning(f"GitHub commits check failed: {e}")

    return {
        "update_available": False,
        "current_version": current_version,
        "latest_version": current_version,
        "changelog": "Up to date.",
        "release_url": f"https://github.com/{GITHUB_REPO}",
        "commit_sha": local_sha[:7] if local_sha else "",
        "remote_sha": "",
        "source": "offline",
        "checked_at": datetime.datetime.now().isoformat()
    }


def backup_user_data() -> str:
    """Safely preserves user configs, API keys, tokens, and custom creators into backup_config/."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    sub_backup = BACKUP_DIR / f"backup_{ts}"
    sub_backup.mkdir(parents=True, exist_ok=True)

    copied = []
    for fname in USER_DATA_FILES:
        src = ROOT_DIR / fname
        if src.exists():
            dest = sub_backup / fname
            shutil.copy2(src, dest)
            # Also keep a latest pointer in backup_config/latest
            latest_dir = BACKUP_DIR / "latest"
            latest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, latest_dir / fname)
            copied.append(fname)

    logger.info(f"Preserved {len(copied)} user configuration files into {sub_backup.name}")
    return str(sub_backup)


def restore_user_data():
    """Restores user configurations from latest backup if they were overwritten."""
    latest_dir = BACKUP_DIR / "latest"
    if not latest_dir.exists():
        return

    for fname in USER_DATA_FILES:
        src = latest_dir / fname
        dest = ROOT_DIR / fname
        if src.exists() and not dest.exists():
            shutil.copy2(src, dest)


def apply_update_and_restart() -> Dict[str, Any]:
    """Applies update preserving all user configurations and triggers restart."""
    logger.info("Starting SyntaxClipper 1-click upgrade sequence...")

    # Step 1: Backup user data
    backup_path = backup_user_data()

    # Step 2: Pull latest code
    is_git_repo = (ROOT_DIR / ".git").exists()
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

    if is_git_repo:
        try:
            logger.info("Pulling latest commits from GitHub via git...")
            subprocess.run(
                ["git", "fetch", "origin", "main"],
                cwd=str(ROOT_DIR),
                check=True,
                creationflags=flags,
                timeout=60
            )
            subprocess.run(
                ["git", "reset", "--hard", "origin/main"],
                cwd=str(ROOT_DIR),
                check=True,
                creationflags=flags,
                timeout=30
            )
        except Exception as e:
            logger.error(f"Git pull failed: {e}. Attempting zipball fallback...")
            _download_and_extract_zip()
    else:
        _download_and_extract_zip()

    # Step 3: Restore user files to ensure zero loss of local API keys / settings
    restore_user_data()

    # Step 4: Update local commit SHA
    try:
        remote_info = check_for_updates()
        local_info = get_local_version_info()
        if remote_info.get("remote_sha"):
            local_info["commit_sha"] = remote_info["remote_sha"]
        save_local_version_info(local_info)
    except Exception:
        pass

    # Step 5: Trigger clean restart via restart script
    trigger_restart()

    return {
        "success": True,
        "message": "Update applied successfully! User data preserved. SyntaxClipper is restarting now...",
        "backup_path": backup_path
    }


def _download_and_extract_zip():
    """Downloads GitHub zipball and extracts updated app files, preserving user data."""
    zip_url = f"https://github.com/{GITHUB_REPO}/archive/refs/heads/main.zip"
    temp_zip = ROOT_DIR / "temp_update.zip"
    temp_extract = ROOT_DIR / "temp_update_extract"

    req = urllib.request.Request(zip_url, headers={"User-Agent": "SyntaxClipper-Updater"})
    with urllib.request.urlopen(req, timeout=60) as response, open(temp_zip, "wb") as out_file:
        shutil.copyfileobj(response, out_file)

    temp_extract.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(temp_zip, "r") as zip_ref:
        zip_ref.extractall(temp_extract)

    # The zip creates a root folder like SyntaxClipper-main
    extracted_root = next(temp_extract.glob("SyntaxClipper-*"), None)
    if not extracted_root:
        extracted_root = temp_extract

    # Copy updated source trees
    for item in extracted_root.iterdir():
        if item.name in USER_DATA_FILES or item.name in ("queue", "exports", "logs", "reports", "temp_clipper", ".git"):
            continue
        dest = ROOT_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)

    # Clean up temp
    try:
        temp_zip.unlink(missing_ok=True)
        shutil.rmtree(temp_extract, ignore_errors=True)
    except Exception:
        pass


def trigger_restart():
    """Detaches and triggers a clean restart of start_syntaxclipper.bat."""
    if sys.platform != "win32":
        return

    restart_bat = ROOT_DIR / "restart_syntaxclipper.bat"
    bat_content = f"""@echo off
timeout /t 3 /nobreak >nul
call "{ROOT_DIR / 'stop_syntaxclipper.bat'}"
timeout /t 2 /nobreak >nul
start "" "{ROOT_DIR / 'start_syntaxclipper.bat'}"
del "%~f0"
exit
"""
    try:
        with open(restart_bat, "w") as f:
            f.write(bat_content)

        flags = subprocess.CREATE_NO_WINDOW | getattr(subprocess, "DETACHED_PROCESS", 0x00000008)
        subprocess.Popen(["cmd.exe", "/c", str(restart_bat)], creationflags=flags)
    except Exception as e:
        logger.error(f"Failed to trigger restart batch script: {e}")
