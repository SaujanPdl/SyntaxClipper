"""multi_publisher.py - Modular Multi-Platform Publishing Dispatcher
Maintained for backwards-compatibility; delegates to backend.publisher.publish_clip.
"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.publisher import publish_clip, save_local_export
from backend.services.youtube_direct_client import upload_youtube_direct, get_oauth_status


def publish_clip_multi_platform(
    clip_path: Path,
    title: str,
    captions: Dict[str, str],
    target_platforms: List[str],
    creator_name: str = "Streamer",
    scheduled_iso: Optional[str] = None,
    progress_callback = None
) -> Dict[str, Any]:
    """Delegates to unified backend.publisher.publish_clip."""
    return publish_clip(
        clip_path=clip_path,
        title=title,
        captions=captions,
        target_platforms=target_platforms,
        creator_name=creator_name,
        scheduled_iso=scheduled_iso,
        progress_callback=progress_callback
    )
