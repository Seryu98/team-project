# app/reports/report_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.auth_service import get_current_user
from app.users.user_model import User
from . import report_service
from .report_schema import ReportCreate, ReportResponse
from .report_model import ReportStatus

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=ReportResponse)
def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id == report.reported_user_id:
        raise HTTPException(status_code=400, detail="자기 자신은 신고할 수 없습니다.")
    return report_service.create_report(db, current_user.id, report)

@router.get("/", response_model=list[ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 관리자만 전체 신고 조회 가능
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    return report_service.get_all_reports(db)

@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_report_status(
    report_id: int,
    status: ReportStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    return report_service.update_report_status(db, report_id, status)
