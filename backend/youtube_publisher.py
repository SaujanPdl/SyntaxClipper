"""youtube_publisher.py - Direct YouTube Data API v3 Upload & Native Studio Scheduling
Supports up to 100 uploads/day free without middleman costs.
Enables native scheduling via status.publishAt and status.privacyStatus="private".
Maintains scheduled videos in youtube_scheduled_posts.json for unified queue visibility.
"""

import os
import json
import logging
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("syntaxclipper.youtube_publisher")

ROOT_DIR = Path(__file__).resolve().parent.parent
CLIENT_SECRET_PATH = ROOT_DIR / "client_secret.json"
YOUTUBE_TOKEN_PATH = ROOT_DIR / "youtube_token.json"
SCHEDULED_POSTS_FILE = ROOT_DIR / "youtube_scheduled_posts.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
]


def load_scheduled_posts() -> List[Dict[str, Any]]:
    """Loads recorded YouTube scheduled posts from disk."""
    if not SCHEDULED_POSTS_FILE.exists():
        return []
    try:
        with open(SCHEDULED_POSTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning(f"Failed to read {SCHEDULED_POSTS_FILE}: {e}")
        return []


def save_scheduled_posts(posts: List[Dict[str, Any]]) -> None:
    """Saves scheduled posts list to disk atomically."""
    tmp_path = SCHEDULED_POSTS_FILE.with_suffix(".tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(posts, f, indent=2)
        tmp_path.replace(SCHEDULED_POSTS_FILE)
    except Exception as e:
        logger.error(f"Failed to save scheduled posts: {e}")


def get_authenticated_service():
    """Builds and returns an authorized YouTube Data API v3 service client."""
    if not YOUTUBE_TOKEN_PATH.exists():
        raise FileNotFoundError("YouTube OAuth token not found (youtube_token.json). Please authorize in Setup Wizard.")

    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(str(YOUTUBE_TOKEN_PATH), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        logger.info("Refreshing expired YouTube OAuth credentials...")
        creds.refresh(Request())
        with open(YOUTUBE_TOKEN_PATH, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

    if not creds.valid:
        raise RuntimeError("YouTube token is invalid. Please re-authorize your channel in Settings.")

    return build("youtube", "v3", credentials=creds)


def schedule_youtube_short(
    video_path: Path,
    title: str,
    description: str,
    scheduled_iso_utc: Optional[str] = None,
    tags: Optional[List[str]] = None,
    privacy_status: str = "private",
    progress_callback = None
) -> Dict[str, Any]:
    """Uploads and optionally schedules a video natively in YouTube Studio.
    
    When scheduled_iso_utc is provided:
      YouTube Data API requires status.privacyStatus = "private" AND status.publishAt = "<ISO_8601_UTC_timestamp>".
      YouTube Studio will automatically hold the video private and publish it publicly at that exact moment.
    """
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    from googleapiclient.http import MediaFileUpload

    youtube = get_authenticated_service()

    clean_title = title.strip()[:100]
    clean_desc = description.strip()
    if "#Shorts" not in clean_title and "#Shorts" not in clean_desc:
        clean_desc = f"{clean_desc}\n\n#Shorts"

    body: Dict[str, Any] = {
        "snippet": {
            "title": clean_title,
            "description": clean_desc,
            "tags": tags or ["Shorts", "gaming", "viral", "highlights"],
            "categoryId": "20"  # Gaming
        },
        "status": {
            "selfDeclaredMadeForKids": False
        }
    }

    # If scheduling in YouTube Studio:
    # YouTube API rules: privacyStatus MUST be 'private' if publishAt is set
    if scheduled_iso_utc:
        # Standardize UTC ISO timestamp
        # Ensure it ends with Z or has proper offset
        iso_str = scheduled_iso_utc.strip()
        if not iso_str.endswith("Z") and "+" not in iso_str:
            iso_str += "Z"
        body["status"]["privacyStatus"] = "private"
        body["status"]["publishAt"] = iso_str
        is_scheduled = True
    else:
        body["status"]["privacyStatus"] = privacy_status
        is_scheduled = False

    logger.info(f"Starting YouTube Data API v3 upload for '{clean_title}' (Scheduled: {scheduled_iso_utc or 'Immediate'})...")

    media = MediaFileUpload(
        str(video_path),
        mimetype="video/mp4",
        resumable=True,
        chunksize=1024 * 1024 * 4  # 4MB chunks
    )

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
    logger.info(f"Direct YouTube Upload Successful: {video_url} (ID: {video_id})")

    # Save to local record
    record = {
        "id": video_id,
        "video_id": video_id,
        "postId": f"yt_{video_id}",
        "socialAccountPostId": f"yt_{video_id}",
        "title": clean_title,
        "description": clean_desc,
        "url": video_url,
        "platform": "youtube",
        "provider": "youtube_direct",
        "provider_name": "YouTube Studio Scheduled",
        "privacy_status": body["status"]["privacyStatus"],
        "publishAt": body["status"].get("publishAt"),
        "scheduledFor": body["status"].get("publishAt"),
        "deliveryStatus": "SCHEDULED" if is_scheduled else ("SENT" if privacy_status == "public" else "UPLOADED_PRIVATE"),
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "thumbnailUrl": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "content": [
            {
                "text": clean_desc,
                "media": [
                    {
                        "type": "video",
                        "url": video_url,
                        "thumbnailUrl": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                    }
                ]
            }
        ]
    }

    posts = load_scheduled_posts()
    # Replace if exists or prepend
    posts = [p for p in posts if p.get("id") != video_id]
    posts.insert(0, record)
    save_scheduled_posts(posts)

    return {
        "success": True,
        "video_id": video_id,
        "url": video_url,
        "title": clean_title,
        "scheduled_at": scheduled_iso_utc,
        "is_scheduled": is_scheduled,
        "privacy_status": body["status"]["privacyStatus"],
        "response": response
    }


def get_scheduled_youtube_videos(filter_status: str = "ALL") -> List[Dict[str, Any]]:
    """Returns scheduled and uploaded YouTube Shorts formatted for Queue/Calendar view."""
    posts = load_scheduled_posts()
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    # Update deliveryStatus dynamically if scheduled time has passed
    changed = False
    for p in posts:
        pub_at = p.get("publishAt") or p.get("scheduledFor")
        if pub_at and p.get("deliveryStatus") == "SCHEDULED":
            try:
                # Parse ISO timestamp
                pub_clean = pub_at.replace("Z", "+00:00")
                pub_dt = datetime.datetime.fromisoformat(pub_clean)
                if pub_dt <= now_utc:
                    p["deliveryStatus"] = "SENT"
                    changed = True
            except Exception:
                pass

    if changed:
        save_scheduled_posts(posts)

    filt = filter_status.upper()
    if filt == "ALL":
        return posts
    elif filt == "SCHEDULED":
        return [p for p in posts if p.get("deliveryStatus") == "SCHEDULED"]
    elif filt == "SENT":
        return [p for p in posts if p.get("deliveryStatus") in ("SENT", "UPLOADED_PRIVATE")]
    elif filt == "FAILED":
        return [p for p in posts if p.get("deliveryStatus") == "FAILED"]
    return posts


def delete_scheduled_youtube_video(video_id: str) -> bool:
    """Deletes a scheduled video from local records and attempts to delete from YouTube."""
    clean_id = video_id.replace("yt_", "").strip()
    posts = load_scheduled_posts()
    initial_len = len(posts)
    posts = [p for p in posts if p.get("id") != clean_id and p.get("video_id") != clean_id and p.get("postId") != video_id]
    if len(posts) != initial_len:
        save_scheduled_posts(posts)

    # Attempt YouTube API deletion if token exists
    try:
        youtube = get_authenticated_service()
        youtube.videos().delete(id=clean_id).execute()
        logger.info(f"Deleted video {clean_id} from YouTube channel.")
        return True
    except Exception as e:
        logger.warning(f"Could not delete video {clean_id} directly from YouTube API: {e}")
        return True
