# app/reports/report_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException
from .report_model import Report, ReportStatus
from .report_schema import ReportCreate

def create_report(db: Session, reporter_id: int, report: ReportCreate):
    # 중복 신고 방지
    exists = db.query(Report).filter(
        Report.reporter_user_id == reporter_id,
        Report.target_type == report.target_type,
        Report.target_id == report.target_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="이미 신고한 대상입니다.")

    new_report = Report(
        reported_user_id=report.reported_user_id,
        reporter_user_id=reporter_id,
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
        status=ReportStatus.PENDING,
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

def get_reports_by_user(db: Session, user_id: int):
    return db.query(Report).filter(Report.reported_user_id == user_id).all()

def get_all_reports(db: Session):
    return db.query(Report).all()

def update_report_status(db: Session, report_id: int, status: ReportStatus):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="신고 내역을 찾을 수 없습니다.")
    report.status = status
    db.commit()
    db.refresh(report)
    return report
