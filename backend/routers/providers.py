"""providers.py - Multi-Provider & Connected Accounts Endpoints
Handles Zernio API verification, YouTube Data API v3 & OAuth, and publishing mode toggles.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.config import get_config, save_config, save_env_key
from backend.services.zernio_client import verify_zernio_key
from backend.services.youtube_direct_client import (
    get_oauth_status,
    save_client_secrets,
    save_token_file,
    get_authorization_url,
    exchange_code_for_token
)

router = APIRouter(prefix="/api/providers", tags=["providers"])


class VerifyZernioRequest(BaseModel):
    api_key: str


class SaveCredentialsRequest(BaseModel):
    content: str


class ExchangeCodeRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = "http://localhost:8000/api/providers/youtube/callback"


class UpdateProviderSettingsRequest(BaseModel):
    publishing_mode: Optional[str] = "hybrid"
    enabled_providers: Optional[List[str]] = None
    youtube_default_privacy: Optional[str] = "private"
    target_platforms: Optional[List[str]] = None


@router.post("/zernio/verify")
def verify_zernio(req: VerifyZernioRequest):
    """Verifies Zernio API Key and returns connected social channels."""
    res = verify_zernio_key(req.api_key)
    if res.get("valid"):
        # Auto-save key and accounts
        save_config({
            "zernio_api_key": req.api_key.strip(),
            "zernio_accounts": res.get("accounts", [])
        })
    return res


@router.get("/youtube/status")
def youtube_status():
    """Returns Direct YouTube Data API v3 OAuth and connection status."""
    return get_oauth_status()


@router.post("/youtube/client-secret")
def upload_client_secret(req: SaveCredentialsRequest):
    """Saves Google OAuth client_secret.json."""
    try:
        res = save_client_secrets(req.content)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/youtube/token")
def upload_youtube_token(req: SaveCredentialsRequest):
    """Saves pre-authorized youtube_token.json."""
    try:
        res = save_token_file(req.content)
        status = get_oauth_status()
        return {"success": True, "status": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/youtube/auth-url")
def youtube_auth_url(redirect_uri: Optional[str] = "http://localhost:8000/api/providers/youtube/callback"):
    """Generates the Google OAuth authorization URL."""
    try:
        return get_authorization_url(redirect_uri or "http://localhost:8000/api/providers/youtube/callback")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/youtube/callback")
def youtube_callback_post(req: ExchangeCodeRequest):
    """Exchanges authorization code for tokens and saves youtube_token.json."""
    try:
        res = exchange_code_for_token(req.code, req.redirect_uri or "http://localhost:8000/api/providers/youtube/callback")
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/youtube/callback", response_class=HTMLResponse)
def youtube_callback_get(code: Optional[str] = None, error: Optional[str] = None):
    """Browser redirect handler for OAuth flow."""
    if error:
        return f"""
        <html>
            <body style="background:#0B0D11;color:#F43F5E;font-family:sans-serif;padding:40px;text-align:center;">
                <h2>YouTube Authorization Failed</h2>
                <p>{error}</p>
                <p>You can close this window and try again in SyntaxClipper.</p>
            </body>
        </html>
        """

    if not code:
        return """
        <html>
            <body style="background:#0B0D11;color:#F0F3F6;font-family:sans-serif;padding:40px;text-align:center;">
                <h2>No code received</h2>
                <p>Please return to SyntaxClipper and retry.</p>
            </body>
        </html>
        """

    try:
        exchange_code_for_token(code)
        return """
        <html>
            <body style="background:#0B0D11;color:#10B981;font-family:sans-serif;padding:40px;text-align:center;">
                <h2>YouTube Channel Authorized Successfully!</h2>
                <p style="color:#94A3B8;">SyntaxClipper is now authorized to upload YouTube Shorts directly.</p>
                <p style="color:#94A3B8;">You can now close this tab and return to the SyntaxClipper app.</p>
                <script>
                    setTimeout(() => window.close(), 3000);
                </script>
            </body>
        </html>
        """
    except Exception as e:
        return f"""
        <html>
            <body style="background:#0B0D11;color:#F43F5E;font-family:sans-serif;padding:40px;text-align:center;">
                <h2>Authorization Exchange Error</h2>
                <p>{str(e)}</p>
            </body>
        </html>
        """


@router.post("/settings")
def update_provider_settings(req: UpdateProviderSettingsRequest):
    """Updates publishing mode and platform preferences."""
    updates: Dict[str, Any] = {}
    if req.publishing_mode:
        updates["publishing_mode"] = req.publishing_mode
    if req.enabled_providers is not None:
        updates["enabled_providers"] = req.enabled_providers
    if req.youtube_default_privacy:
        updates["youtube_default_privacy"] = req.youtube_default_privacy
    if req.target_platforms is not None:
        cfg = get_config()
        prefs = dict(cfg.get("preferences", {}))
        prefs["target_platforms"] = req.target_platforms
        updates["preferences"] = prefs

    saved = save_config(updates)
    return {"success": True, "config": saved}
