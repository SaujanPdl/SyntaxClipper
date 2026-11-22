from fastapi import APIRouter
from fastapi.responses import FileResponse
from backend.services.analytics_service import get_analytics_overview, generate_weekly_report

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def overview():
    return get_analytics_overview()


@router.post("/generate-report")
def generate_report():
    return generate_weekly_report()


@router.get("/download-report/{filename}")
def download_report(filename: str):
    from backend.config import REPORTS_DIR
    target = REPORTS_DIR / filename
    if not target.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path=str(target), filename=filename, media_type="text/markdown")
