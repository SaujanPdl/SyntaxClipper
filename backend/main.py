"""main.py - SyntaxClipper FastAPI Backend Application
Branded "SyntaxClipper by Syntax Nepal"
"""

import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.routers import (
    system,
    config,
    woopsocial,
    providers,
    clips,
    library,
    autopilot,
    analytics
)

app = FastAPI(
    title="SyntaxClipper API",
    description="Autonomous Video Clipping and WoopSocial Scheduling Engine by Syntax Nepal",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(system.router)
app.include_router(config.router)
app.include_router(woopsocial.router)
app.include_router(providers.router)
app.include_router(clips.router)
app.include_router(library.router)
app.include_router(autopilot.router)
app.include_router(analytics.router)

# Mount media static directories
PREVIEWS_DIR = BASE_DIR / "temp_clipper" / "previews"
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media/previews", StaticFiles(directory=str(PREVIEWS_DIR)), name="previews")

EXPORTS_DIR = BASE_DIR / "exports" / "local"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "app": "SyntaxClipper",
        "brand": "SyntaxClipper by Syntax Nepal",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
