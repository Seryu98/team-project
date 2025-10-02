from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from datetime import datetime

from .report_model import Report, ReportStatus, TargetType
from .report_schema import ReportCreate
from app.notify.notification_model import Notification, NotificationType


def _assert_target_and_owner(db: Session, reported_user_id: int, target_type: TargetType, target_id: int):
    """
    대상이 실제로 존재하는지, 그리고 해당 대상의 소유자(작성자)가 reported_user_id 와 일치하는지 검증.
    필요에 따라 실제 스키마에 맞게 쿼리를 수정하세요.
    """
    if target_type == TargetType.USER:
        return

    if target_type in (TargetType.POST, TargetType.BOARD_POST):
        owner = db.execute(text("SELECT leader_id FROM posts WHERE id=:id"), {"id": target_id}).scalar()
        if not owner:
            raise HTTPException(status_code=404, detail="대상이 존재하지 않습니다.")
        if int(owner) != int(reported_user_id):
            raise HTTPException(status_code=400, detail="피신고자와 대상 작성자가 일치하지 않습니다.")
        return

    if target_type == TargetType.COMMENT:
        # comments 테이블이 없는 프로젝트면 이 블록을 비활성화하세요.
        owner = db.execute(text("SELECT user_id FROM comments WHERE id=:id"), {"id": target_id}).scalar()
        if not owner:
            raise HTTPException(status_code=404, detail="대상이 존재하지 않습니다.")
        if int(owner) != int(reported_user_id):
            raise HTTPException(status_code=400, detail="피신고자와 대상 작성자가 일치하지 않습니다.")
        return


def _notify_admins_report_received(db: Session, report_id: int):
    # ADMIN 전원에게 알림 브로드캐스트
    try:
        admin_rows = db.execute(text("SELECT id FROM users WHERE role='ADMIN'")).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="관리자 알림 전송 실패: users.role 컬럼 확인 필요")

    for row in admin_rows:
        admin_id = row[0] if isinstance(row, tuple) else row.id
        db.add(Notification(
            user_id=admin_id,
            notification_type=NotificationType.REPORT_RECEIVED,
            message=f"새 신고가 접수되었습니다 (ID: {report_id})",
            related_id=report_id,
            is_read=False,
            created_at=datetime.utcnow(),
        ))


def _notify_reporter_status(db: Session, reporter_id: int, report_id: int, status: ReportStatus):
    if status == ReportStatus.RESOLVED:
        notif_type = NotificationType.REPORT_RESOLVED
        status_text = "승인"
    elif status == ReportStatus.REJECTED:
        notif_type = NotificationType.REPORT_REJECTED
        status_text = "거절"
    else:
        return

    db.add(Notification(
        user_id=reporter_id,
        notification_type=notif_type,
        message=f"귀하의 신고(ID:{report_id})가 {status_text} 처리되었습니다.",
        related_id=report_id,
        is_read=False,
        created_at=datetime.utcnow(),
    ))


def create_report(db: Session, reporter_id: int, report: ReportCreate):
    # 1) 자기자신 신고 차단
    if report.reported_user_id is not None and int(reporter_id) == int(report.reported_user_id):
        raise HTTPException(status_code=400, detail="자기 자신은 신고할 수 없습니다.")

    # 2) USER 타입 정합성: target_id == reported_user_id
    if report.target_type == TargetType.USER:
        if not report.reported_user_id:
            raise HTTPException(status_code=400, detail="USER 신고는 reported_user_id가 필요합니다.")
        if int(report.reported_user_id) != int(report.target_id):
            raise HTTPException(status_code=400, detail="USER 신고는 target_id와 reported_user_id가 같아야 합니다.")

    # 3) 대상 존재/소유자 검증
    if report.target_type != TargetType.USER:
        if not report.reported_user_id:
            raise HTTPException(status_code=400, detail="피신고자 ID가 필요합니다.")
        _assert_target_and_owner(db, report.reported_user_id, report.target_type, report.target_id)

    # 4) 중복 신고 방지
    exists = db.query(Report).filter(
        Report.reporter_user_id == reporter_id,
        Report.target_type == report.target_type,
        Report.target_id == report.target_id,
        Report.deleted_at.is_(None)
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="이미 신고한 대상입니다.")

    # 5) 생성 + flush 로 ID 확보
    new_report = Report(
        reported_user_id=report.reported_user_id,
        reporter_user_id=reporter_id,
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
        status=ReportStatus.PENDING,
    )
    db.add(new_report)
    db.flush()  # ✅ ID 확보 (commit 없이)

    # 6) 관리자 알림 생성 (커밋은 마지막에 한 번)
    _notify_admins_report_received(db, new_report.id)

    # 7) 커밋 1회
    db.commit()
    db.refresh(new_report)
    return new_report


def get_all_reports(db: Session, page: int = 1, size: int = 20,
                    status: ReportStatus | None = None, target_type: TargetType | None = None):
    q = db.query(Report).filter(Report.deleted_at.is_(None))
    if status:
        q = q.filter(Report.status == status)
    if target_type:
        q = q.filter(Report.target_type == target_type)
    return q.order_by(Report.created_at.desc()).offset((page - 1) * size).limit(size).all()


def update_report_status(db: Session, report_id: int, status: ReportStatus):
    report = db.query(Report).filter(Report.id == report_id, Report.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=404, detail="신고 내역을 찾을 수 없습니다.")

    # 동일 상태 재설정 방지
    if report.status == status:
        return report

    report.status = status
    db.flush()  # 변경만 flush

    _notify_reporter_status(db, report.reporter_user_id, report.id, status)

    db.commit()
    db.refresh(report)
    return report
