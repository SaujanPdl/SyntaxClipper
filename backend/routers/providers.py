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
    state: Optional[str] = None
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


@router.get("/youtube/auth")
@router.post("/youtube/auth")
@router.post("/youtube/auth-url")
def youtube_auth_url(redirect_uri: Optional[str] = "http://localhost:8000/api/providers/youtube/callback"):
    """Generates the Google OAuth authorization URL with PKCE verifier."""
    try:
        return get_authorization_url(redirect_uri or "http://localhost:8000/api/providers/youtube/callback")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/youtube/callback")
def youtube_callback_post(req: ExchangeCodeRequest):
    """Exchanges authorization code for tokens and saves youtube_token.json."""
    try:
        res = exchange_code_for_token(
            code=req.code,
            redirect_uri=req.redirect_uri or "http://localhost:8000/api/providers/youtube/callback",
            state=req.state
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/youtube/callback", response_class=HTMLResponse)
def youtube_callback_get(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    """Browser redirect handler for OAuth flow with PKCE verifier lookup."""
    if error:
        return f"""
        <!DOCTYPE html>
        <html>
            <head><title>YouTube Authorization Failed</title></head>
            <body style="background:#0B0D11;color:#F43F5E;font-family:system-ui,-apple-system,sans-serif;padding:60px;text-align:center;">
                <div style="background:#12151C;border:1px solid #242936;border-radius:16px;padding:40px;max-width:540px;margin:0 auto;">
                    <h2 style="font-size:22px;margin:0 0 12px 0;">YouTube Authorization Failed</h2>
                    <p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 16px 0;">{error}</p>
                    <p style="color:#64748B;font-size:12px;">You can close this window and try again in SyntaxClipper.</p>
                </div>
            </body>
        </html>
        """

    if not code:
        return """
        <!DOCTYPE html>
        <html>
            <head><title>No Code Received</title></head>
            <body style="background:#0B0D11;color:#F0F3F6;font-family:system-ui,-apple-system,sans-serif;padding:60px;text-align:center;">
                <div style="background:#12151C;border:1px solid #242936;border-radius:16px;padding:40px;max-width:540px;margin:0 auto;">
                    <h2 style="font-size:22px;margin:0 0 12px 0;">No Authorization Code Received</h2>
                    <p style="color:#94A3B8;font-size:14px;">Please return to SyntaxClipper and retry authorizing your YouTube channel.</p>
                </div>
            </body>
        </html>
        """

    try:
        res = exchange_code_for_token(code=code, state=state)
        channel_title = res.get("status", {}).get("channel", {}).get("title") or "Your Channel"
        return f"""
        <!DOCTYPE html>
        <html>
            <head>
                <title>YouTube Connected</title>
                <style>
                    body {{
                        background: #0B0D11;
                        color: #10B981;
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                    }}
                    .card {{
                        background: #12151C;
                        border: 1px solid #242936;
                        border-radius: 16px;
                        padding: 48px;
                        text-align: center;
                        max-width: 480px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    }}
                    .badge {{
                        background: rgba(16, 185, 129, 0.15);
                        color: #34D399;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        display: inline-block;
                        padding: 6px 16px;
                        border-radius: 9999px;
                        font-size: 13px;
                        font-weight: 600;
                        margin-bottom: 20px;
                    }}
                    h2 {{
                        color: #FFFFFF;
                        font-size: 22px;
                        margin: 0 0 8px 0;
                    }}
                    p {{
                        color: #94A3B8;
                        font-size: 14px;
                        line-height: 1.5;
                        margin: 0 0 20px 0;
                    }}
                    .timer {{
                        color: #64748B;
                        font-size: 12px;
                        font-family: monospace;
                    }}
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="badge">✓ Connected Successfully</div>
                    <h2>YouTube Connected!</h2>
                    <p>Authorized channel: <strong style="color:#FFF;">{channel_title}</strong>.<br/>SyntaxClipper is now ready to upload and schedule YouTube Shorts directly.</p>
                    <p class="timer">YouTube Connected! You can close this tab and return to SyntaxClipper.</p>
                </div>
                <script>
                    setTimeout(() => {{
                        try {{ window.close(); }} catch(e) {{}}
                    }}, 2500);
                </script>
            </body>
        </html>
        """
    except Exception as e:
        return f"""
        <!DOCTYPE html>
        <html>
            <head><title>Authorization Exchange Error</title></head>
            <body style="background:#0B0D11;color:#F43F5E;font-family:system-ui,-apple-system,sans-serif;padding:60px;text-align:center;">
                <div style="background:#12151C;border:1px solid #242936;border-radius:16px;padding:40px;max-width:540px;margin:0 auto;">
                    <h2 style="font-size:22px;margin:0 0 12px 0;">Authorization Exchange Error</h2>
                    <p style="color:#FDA4AF;font-size:14px;line-height:1.5;margin:0 0 16px 0;word-break:break-word;">{str(e)}</p>
                    <p style="color:#64748B;font-size:12px;">Please return to SyntaxClipper Setup Wizard and click "Authorize YouTube Channel" again.</p>
                </div>
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
