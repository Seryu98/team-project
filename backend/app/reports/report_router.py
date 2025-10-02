# ✅ report_router.py (교체)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.auth_service import get_current_user
from app.users.user_model import User
from . import report_service
from .report_schema import ReportCreate, ReportResponse
from .report_model import ReportStatus, TargetType

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=ReportResponse, status_code=201)
def create_report(payload: ReportCreate, db: Session=Depends(get_db), current_user: User=Depends(get_current_user)):
    return report_service.create_report(db, current_user.id, payload)

@router.get("/", response_model=list[ReportResponse])
def list_reports(
    page: int=1,
    size: int=20,
    status: ReportStatus | None = None,
    target_type: TargetType | None = None,  # ✅ Enum 타입
    db: Session=Depends(get_db),
    current_user: User=Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    return report_service.get_all_reports(db, page, size, status, target_type)

@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_report_status(report_id: int, body: dict, db: Session=Depends(get_db), current_user: User=Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    new_status = ReportStatus(body["status"])
    return report_service.update_report_status(db, report_id, new_status)
