from fastapi import APIRouter
from backend.services.system_checker import run_system_check, auto_install_missing_packages

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/check")
def get_system_status():
    return run_system_check()


@router.post("/install-missing")
def install_missing():
    return auto_install_missing_packages()
