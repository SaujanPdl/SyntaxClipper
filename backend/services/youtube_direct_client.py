"""youtube_direct_client.py - Direct YouTube Data API v3 Upload & OAuth 2.0
Enables up to 100 uploads/day free without any third-party intermediary.
Uses google-auth-oauthlib and google-api-python-client.
"""

import os
import json
import logging
import secrets
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("syntaxclipper.youtube_direct")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CLIENT_SECRET_PATH = ROOT_DIR / "client_secret.json"
YOUTUBE_TOKEN_PATH = ROOT_DIR / "youtube_token.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
]

# In-memory PKCE session cache keyed by state and 'latest'
_oauth_sessions: Dict[str, Dict[str, Any]] = {}


def get_oauth_status() -> Dict[str, Any]:
    """Checks the status of YouTube OAuth configuration and token validity."""
    has_client_secret = CLIENT_SECRET_PATH.exists()
    has_token = YOUTUBE_TOKEN_PATH.exists()

    if not has_client_secret:
        return {
            "configured": False,
            "has_client_secret": False,
            "has_token": False,
            "channel": None,
            "message": "client_secret.json not found. Please upload or paste your Google Cloud OAuth credentials."
        }

    if not has_token:
        return {
            "configured": False,
            "has_client_secret": True,
            "has_token": False,
            "channel": None,
            "message": "client_secret.json found. Please authorize your YouTube channel."
        }

    # Verify token
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials.from_authorized_user_file(str(YOUTUBE_TOKEN_PATH), SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(YOUTUBE_TOKEN_PATH, "w", encoding="utf-8") as f:
                f.write(creds.to_json())

        if not creds.valid:
            return {
                "configured": False,
                "has_client_secret": True,
                "has_token": True,
                "channel": None,
                "message": "YouTube token is invalid or expired. Please re-authorize."
            }

        # Fetch channel profile
        youtube = build("youtube", "v3", credentials=creds)
        res = youtube.channels().list(mine=True, part="snippet,statistics").execute()
        items = res.get("items", [])
        if items:
            snippet = items[0].get("snippet", {})
            stats = items[0].get("statistics", {})
            channel_info = {
                "id": items[0].get("id"),
                "title": snippet.get("title"),
                "customUrl": snippet.get("customUrl"),
                "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
                "subscribers": stats.get("subscriberCount", "0"),
                "videoCount": stats.get("videoCount", "0")
            }
            return {
                "configured": True,
                "has_client_secret": True,
                "has_token": True,
                "channel": channel_info,
                "message": f"Connected to YouTube Channel: {channel_info['title']}"
            }
        else:
            return {
                "configured": True,
                "has_client_secret": True,
                "has_token": True,
                "channel": {"title": "Authorized Channel"},
                "message": "Connected to YouTube account."
            }

    except Exception as e:
        logger.warning(f"Error checking YouTube token: {e}")
        return {
            "configured": False,
            "has_client_secret": True,
            "has_token": True,
            "channel": None,
            "error": str(e),
            "message": f"YouTube authentication check failed: {str(e)}"
        }


def save_client_secrets(content: str) -> Dict[str, Any]:
    """Saves uploaded or pasted client_secret.json."""
    try:
        data = json.loads(content)
        # Validate format
        if "installed" not in data and "web" not in data:
            raise ValueError("Invalid client_secret.json format. Must contain 'installed' or 'web' client configuration.")

        with open(CLIENT_SECRET_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return {"success": True, "message": "client_secret.json saved successfully."}
    except Exception as e:
        raise ValueError(f"Failed to parse and save client_secret.json: {str(e)}")


def save_token_file(content: str) -> Dict[str, Any]:
    """Saves pasted youtube_token.json."""
    try:
        data = json.loads(content)
        with open(YOUTUBE_TOKEN_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return {"success": True, "message": "youtube_token.json saved successfully."}
    except Exception as e:
        raise ValueError(f"Failed to parse and save youtube_token.json: {str(e)}")


def get_authorization_url(redirect_uri: str = "http://localhost:8000/api/providers/youtube/callback") -> Dict[str, Any]:
    """Generates OAuth authorization URL for the user to authorize YouTube channel.
    Stores code_verifier in _oauth_sessions keyed by state and 'latest' to satisfy PKCE during callback.
    """
    if not CLIENT_SECRET_PATH.exists():
        raise FileNotFoundError("client_secret.json not found. Please provide OAuth credentials first.")

    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(
            str(CLIENT_SECRET_PATH),
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        # Generate and attach code_verifier for PKCE flow
        code_verifier = secrets.token_urlsafe(64)
        flow.code_verifier = code_verifier

        auth_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"
        )
        saved_verifier = getattr(flow, "code_verifier", code_verifier) or code_verifier
        session_info = {
            "code_verifier": saved_verifier,
            "redirect_uri": redirect_uri,
            "state": state
        }
        _oauth_sessions[state] = session_info
        _oauth_sessions["latest"] = session_info
        logger.info(f"Generated OAuth URL for YouTube (state={state[:8]}..., verifier length={len(saved_verifier)})")

        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        logger.error(f"Failed to generate OAuth URL: {e}")
        raise RuntimeError(f"Failed to generate OAuth URL: {str(e)}")


def exchange_code_for_token(
    code: str,
    redirect_uri: Optional[str] = None,
    state: Optional[str] = None
) -> Dict[str, Any]:
    """Exchanges authorization code for token and saves youtube_token.json.
    Restores matching code_verifier from _oauth_sessions to satisfy PKCE.
    """
    if not CLIENT_SECRET_PATH.exists():
        raise FileNotFoundError("client_secret.json not found.")

    try:
        from google_auth_oauthlib.flow import Flow

        # Look up saved session
        session_data = {}
        if state and state in _oauth_sessions:
            session_data = _oauth_sessions[state]
        elif "latest" in _oauth_sessions:
            session_data = _oauth_sessions["latest"]

        target_redirect_uri = redirect_uri or session_data.get("redirect_uri") or "http://localhost:8000/api/providers/youtube/callback"
        saved_code_verifier = session_data.get("code_verifier")
        saved_state = state or session_data.get("state")

        flow = Flow.from_client_secrets_file(
            str(CLIENT_SECRET_PATH),
            scopes=SCOPES,
            redirect_uri=target_redirect_uri,
            state=saved_state
        )

        if saved_code_verifier:
            flow.code_verifier = saved_code_verifier
            logger.info("Attached code_verifier to OAuth exchange flow.")
        else:
            logger.warning("No code_verifier found in _oauth_sessions for this state/session.")

        flow.fetch_token(code=code)
        creds = flow.credentials

        with open(YOUTUBE_TOKEN_PATH, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

        # Check channel info and persist
        status = get_oauth_status()
        if status.get("configured") and status.get("channel"):
            try:
                from backend.config import save_config
                save_config({
                    "youtube_oauth_configured": True,
                    "youtube_channel_info": status.get("channel")
                })
            except Exception as e:
                logger.warning(f"Could not persist channel info to config: {e}")

        logger.info(f"YouTube OAuth code exchanged successfully! Channel: {status.get('channel', {}).get('title')}")
        return {"success": True, "status": status}
    except Exception as e:
        logger.error(f"Failed to exchange authorization code: {e}")
        raise RuntimeError(f"Failed to exchange authorization code: {str(e)}")


def upload_youtube_direct(
    video_path: Path,
    title: str,
    description: str,
    tags: Optional[List[str]] = None,
    privacy_status: str = "private",
    scheduled_iso: Optional[str] = None,
    progress_callback = None
) -> Dict[str, Any]:
    """Uploads or schedules a video directly to YouTube via Data API v3 resumable upload.
    Free tier allows up to 100 uploads/day.
    Delegates to backend.youtube_publisher.schedule_youtube_short to support native publishAt scheduling
    and unified queue tracking.
    """
    from backend.youtube_publisher import schedule_youtube_short
    return schedule_youtube_short(
        video_path=video_path,
        title=title,
        description=description,
        scheduled_iso_utc=scheduled_iso,
        tags=tags,
        privacy_status=privacy_status,
        progress_callback=progress_callback
    )
