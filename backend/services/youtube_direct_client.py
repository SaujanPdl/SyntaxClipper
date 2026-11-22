"""youtube_direct_client.py - Direct YouTube Data API v3 Upload & OAuth 2.0
Enables up to 100 uploads/day free without any third-party intermediary.
Uses google-auth-oauthlib and google-api-python-client.
"""

import os
import json
import logging
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
    """Generates OAuth authorization URL for the user to authorize YouTube channel."""
    if not CLIENT_SECRET_PATH.exists():
        raise FileNotFoundError("client_secret.json not found. Please provide OAuth credentials first.")

    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(
            str(CLIENT_SECRET_PATH),
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        auth_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"
        )
        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        raise RuntimeError(f"Failed to generate OAuth URL: {str(e)}")


def exchange_code_for_token(code: str, redirect_uri: str = "http://localhost:8000/api/providers/youtube/callback") -> Dict[str, Any]:
    """Exchanges authorization code for token and saves youtube_token.json."""
    if not CLIENT_SECRET_PATH.exists():
        raise FileNotFoundError("client_secret.json not found.")

    try:
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_secrets_file(
            str(CLIENT_SECRET_PATH),
            scopes=SCOPES,
            redirect_uri=redirect_uri
        )
        flow.fetch_token(code=code)
        creds = flow.credentials

        with open(YOUTUBE_TOKEN_PATH, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

        # Check channel info
        status = get_oauth_status()
        return {"success": True, "status": status}
    except Exception as e:
        raise RuntimeError(f"Failed to exchange authorization code: {str(e)}")


def upload_youtube_direct(
    video_path: Path,
    title: str,
    description: str,
    tags: Optional[List[str]] = None,
    privacy_status: str = "private",
    progress_callback = None
) -> Dict[str, Any]:
    """Uploads a video directly to YouTube via Data API v3 resumable upload.
    Free tier allows up to 100 uploads/day (1,600 units per upload / 10,000 daily quota limit).
    """
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    if not YOUTUBE_TOKEN_PATH.exists():
        raise FileNotFoundError("YouTube is not authorized. Please complete OAuth authorization.")

    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    creds = Credentials.from_authorized_user_file(str(YOUTUBE_TOKEN_PATH), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(YOUTUBE_TOKEN_PATH, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

    youtube = build("youtube", "v3", credentials=creds)

    clean_title = title[:100]
    if "#Shorts" not in clean_title and "#Shorts" not in description:
        description += "\n\n#Shorts"

    body = {
        "snippet": {
            "title": clean_title,
            "description": description,
            "tags": tags or ["Shorts", "gaming", "viral", "highlights"],
            "categoryId": "20"  # Gaming category
        },
        "status": {
            "privacyStatus": privacy_status,
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(str(video_path), mimetype="video/mp4", resumable=True, chunksize=1024 * 1024 * 4)

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status and progress_callback:
            progress_callback(f"YouTube upload progress: {int(status.progress() * 100)}%")

    video_id = response.get("id")
    video_url = f"https://youtu.be/{video_id}"
    logger.info(f"Direct YouTube Upload Successful: {video_url} ({privacy_status})")

    return {
        "success": True,
        "video_id": video_id,
        "url": video_url,
        "title": clean_title,
        "privacy_status": privacy_status,
        "response": response
    }
