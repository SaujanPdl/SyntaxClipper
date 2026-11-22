"""woopsocial_client.py - Production Client for WoopSocial REST and MCP APIs
Handles projects, social accounts, post scheduling, chunked media uploads, and analytics.
"""

import os
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

WOOPSOCIAL_REST_URL = "https://api.woopsocial.com/v1"
WOOPSOCIAL_MCP_URL = "https://api.woopsocial.com/mcp"


def _headers(api_key: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


def mcp_call(api_key: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Executes a JSON-RPC tool call on the WoopSocial MCP server."""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": int(time.time() * 1000),
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        WOOPSOCIAL_MCP_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key.strip()}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            for line in raw.splitlines():
                if line.startswith("data: "):
                    return json.loads(line[6:])
            try:
                return json.loads(raw)
            except Exception:
                return {}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"WoopSocial MCP HTTP {e.code}: {err}")
    except Exception as e:
        raise RuntimeError(f"WoopSocial MCP Request failed: {e}")


def rest_get(api_key: str, endpoint: str) -> Any:
    """Executes a GET request on WoopSocial REST API."""
    url = f"{WOOPSOCIAL_REST_URL}/{endpoint.lstrip('/')}"
    req = urllib.request.Request(url, headers=_headers(api_key), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {err}")
    except Exception as e:
        raise RuntimeError(f"REST request failed: {e}")


def rest_delete(api_key: str, endpoint: str) -> Any:
    """Executes a DELETE request on WoopSocial REST API."""
    url = f"{WOOPSOCIAL_REST_URL}/{endpoint.lstrip('/')}"
    req = urllib.request.Request(url, headers=_headers(api_key), method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {err}")


def verify_connection(api_key: str) -> Dict[str, Any]:
    """Validates the API key and returns projects and connected social accounts."""
    if not api_key:
        return {"valid": False, "error": "API key is empty", "projects": [], "accounts": []}

    try:
        projects = rest_get(api_key, "projects")
        accounts = rest_get(api_key, "social-accounts")

        active_accounts = []
        for acc in accounts:
            active_accounts.append({
                "id": acc.get("id"),
                "projectId": acc.get("projectId"),
                "platform": acc.get("platform", "").upper(),
                "username": acc.get("username", "Unknown"),
                "imageUrl": acc.get("imageUrl", ""),
                "status": acc.get("status", "DISCONNECTED"),
                "connected": acc.get("status") == "CONNECTED"
            })

        return {
            "valid": True,
            "projects": projects,
            "accounts": active_accounts
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "projects": [],
            "accounts": []
        }


def get_social_account_posts(api_key: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all social account posts, optionally filtered by deliveryStatus."""
    data = rest_get(api_key, "social-account-posts")
    posts = data.get("socialAccountPosts", [])

    if status_filter and status_filter.upper() != "ALL":
        target = status_filter.upper()
        posts = [p for p in posts if p.get("deliveryStatus", "").upper() == target]

    # Sort descending by createdAt
    posts.sort(key=lambda p: p.get("createdAt", ""), reverse=True)
    return posts


def upload_media_session(api_key: str, project_id: str, file_path: Path) -> str:
    """Performs multipart chunked upload to WoopSocial and returns mediaId."""
    if not file_path.exists():
        raise FileNotFoundError(f"Media file not found: {file_path}")

    file_size = file_path.stat().st_size
    create_res = mcp_call(api_key, "media_uploads_create_session", {
        "projectId": project_id,
        "fileSizeInBytes": file_size
    })

    content = create_res.get("result", {}).get("content", [])
    raw_text = content[0].get("text", "{}") if content else "{}"
    session_data = json.loads(raw_text)

    upload_session_id = session_data.get("uploadSessionId")
    part_size = session_data.get("partSizeInBytes")
    parts = session_data.get("parts", [])

    if not upload_session_id or not parts:
        raise RuntimeError(f"Invalid upload session response: {create_res}")

    with open(file_path, "rb") as f:
        for p in parts:
            chunk = f.read(part_size)
            put_req = urllib.request.Request(p["uploadUrl"], data=chunk, method="PUT")
            with urllib.request.urlopen(put_req, timeout=90) as put_resp:
                if put_resp.status != 200:
                    raise RuntimeError(f"Part upload failed with HTTP {put_resp.status}")

    comp_res = mcp_call(api_key, "media_uploads_complete_session", {
        "uploadSessionId": upload_session_id
    })

    comp_content = comp_res.get("result", {}).get("content", [])
    comp_data = json.loads(comp_content[0].get("text", "{}") if comp_content else "{}")
    media_id = comp_data.get("mediaId")
    if not media_id:
        raise RuntimeError(f"Could not retrieve mediaId after upload: {comp_res}")

    return media_id


def create_or_schedule_post(
    api_key: str,
    project_id: str,
    media_id: str,
    title: str,
    yt_description: str,
    tiktok_caption: str,
    account_targets: List[Dict[str, Any]],
    scheduled_iso: Optional[str] = None
) -> Dict[str, Any]:
    """Publishes immediately or schedules a post across chosen social accounts."""
    import re
    clean_title = re.sub(r'[^\w\s\-\.,!?\'\"#@]', '', title).strip() or "Gaming Clip"
    clean_title = clean_title[:95]

    yt_desc = yt_description.strip() if yt_description else f"{clean_title}\n\n#Shorts"
    if "#Shorts" not in yt_desc and "#shorts" not in yt_desc:
        yt_desc += "\n\n#Shorts"

    social_accounts_payload = []
    for acc in account_targets:
        plat = acc.get("platform", "").upper()
        acc_id = acc.get("id") or acc.get("socialAccountId")
        if plat == "YOUTUBE":
            social_accounts_payload.append({
                "platform": "YOUTUBE",
                "socialAccountId": acc_id,
                "title": clean_title,
                "privacy": "public",
                "category": "20",  # Gaming
                "madeForKids": False,
                "tags": ["Gaming", "Shorts", "Viral", "Clips"],
                "contentOverride": [
                    {
                        "text": yt_desc,
                        "media": [{"type": "MEDIA_LIBRARY", "mediaId": media_id}]
                    }
                ]
            })
        elif plat == "TIKTOK":
            social_accounts_payload.append({
                "platform": "TIKTOK",
                "socialAccountId": acc_id,
                "postType": "VIDEO",
                "privacyLevel": "PUBLIC_TO_EVERYONE",
                "allowComment": True,
                "allowDuet": True,
                "allowStitch": True,
                "isYourBrand": False,
                "isBrandedContent": False,
                "autoAddMusic": False
            })

    schedule_cfg: Dict[str, Any] = {"type": "PUBLISH_NOW"}
    if scheduled_iso:
        schedule_cfg = {
            "type": "SCHEDULE_FOR_LATER",
            "scheduledFor": scheduled_iso
        }

    post_args = {
        "schedule": schedule_cfg,
        "content": [
            {
                "text": tiktok_caption,
                "media": [{"type": "MEDIA_LIBRARY", "mediaId": media_id}]
            }
        ],
        "socialAccounts": social_accounts_payload
    }

    res = mcp_call(api_key, "posts_create", post_args)
    if res.get("result", {}).get("isError"):
        raise RuntimeError(f"WoopSocial post rejected: {res}")

    content = res.get("result", {}).get("content", [])
    raw_text = content[0].get("text", "{}") if content else "{}"
    return json.loads(raw_text)


def retry_failed_post(api_key: str, failed_post_id: str) -> Dict[str, Any]:
    """Retries a failed social account post by fetching its details and resubmitting."""
    posts = get_social_account_posts(api_key)
    target = None
    for p in posts:
        if p.get("socialAccountPostId") == failed_post_id or p.get("postId") == failed_post_id:
            target = p
            break

    if not target:
        raise ValueError(f"Post {failed_post_id} not found in WoopSocial")

    # Extract mediaId
    media_id = None
    content_list = target.get("content", [])
    if content_list and "media" in content_list[0] and content_list[0]["media"]:
        media_id = content_list[0]["media"][0].get("mediaId")

    if not media_id:
        raise ValueError("Could not extract mediaId from failed post to retry")

    project_id = target.get("projectId")
    title = target.get("title", "Retried Gaming Clip")
    caption = content_list[0].get("text", title) if content_list else title
    social_account_id = target.get("socialAccountId")
    platform = target.get("platform")

    targets = [{"id": social_account_id, "platform": platform}]
    return create_or_schedule_post(
        api_key=api_key,
        project_id=project_id,
        media_id=media_id,
        title=title,
        yt_description=caption,
        tiktok_caption=caption,
        account_targets=targets,
        scheduled_iso=None
    )


def delete_social_post(api_key: str, post_id: str) -> Dict[str, Any]:
    """Deletes or cancels a post on WoopSocial."""
    res = mcp_call(api_key, "posts_delete", {"postId": post_id})
    return res
