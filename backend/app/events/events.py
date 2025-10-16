# app/events/events.py
# ✅ 이벤트 허브: 서비스/라우터에서 이 함수들만 호출하세요.
from typing import Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.notifications.notification_service import send_notification
from app.messages.message_service import send_message
from app.notifications.notification_model import NotificationType

logger = logging.getLogger(__name__)


def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close


def _get_admin_ids(db: Session) -> list[int]:
    rows = db.execute(
        text("SELECT id FROM users WHERE role='ADMIN' AND status='ACTIVE'")
    ).mappings().all()
    return [r["id"] for r in rows]


# ✅ 게시글 생성 시 관리자에게 승인 요청 알림
def on_post_submitted(post_id: int, leader_id: int, db: Optional[Session] = None):
    db, close = _get_db(db)
    try:
        for admin_id in _get_admin_ids(db):
            send_notification(
                user_id=admin_id,
                type_="APPLICATION",
                message=f"승인 요청이 도착했습니다. (post_id={post_id})",
                related_id=post_id,
                db=db,
            )
        db.commit()
        logger.info(f"📨 게시글 승인요청 알림 전송 완료: post_id={post_id}")
    finally:
        if close:
            db.close()


# ✅ 게시글 승인 시 리더에게 승인 알림
def on_post_approved(post_id: int, leader_id: int, db: Optional[Session] = None):
    db, close = _get_db(db)
    try:
        send_notification(
            user_id=leader_id,
            type_="APPLICATION",
            message=f"게시글이 승인되었습니다. (post_id={post_id})",
            related_id=post_id,
            db=db,
        )
        db.commit()
        logger.info(f"✅ 게시글 승인 알림 전송: post_id={post_id}, leader_id={leader_id}")
    finally:
        if close:
            db.close()


# ✅ 지원서 제출 시 리더에게 알림 + 메시지
def on_application_submitted(
    application_id: int,
    post_id: int,
    leader_id: int,
    applicant_id: int,
    db: Optional[Session] = None,
):
    """지원서 제출 시 리더에게 알림 + 메시지."""
    db, close = _get_db(db)
    try:
        # ✅ 지원서 답변들 불러오기
        answers = db.execute(text("""
            SELECT f.name AS field_name, a.answer_text
            FROM application_answers a
            JOIN application_fields f ON a.field_id = f.id
            WHERE a.application_id = :app_id
        """), {"app_id": application_id}).mappings().all()

        # ✅ 답변 내용을 문자열로 구성
        if answers:
            answer_texts = "\n".join(
                [f"{row['field_name']}: {row['answer_text']}" for row in answers]
            )
        else:
            answer_texts = "(답변 내용 없음)"

        # ✅ 알림 (관리자 알림)
        send_notification(
            user_id=leader_id,
            type_="APPLICATION",
            message=f"새 지원서가 도착했습니다. (application_id={application_id}, post_id={post_id})",
            related_id=application_id,
            db=db,
        )

        # ✅ 메시지 (리더에게 보냄)
        send_message(
            sender_id=applicant_id,
            receiver_id=leader_id,
            content=(
                f"안녕하세요. 지원서를 제출했습니다. (application_id={application_id}, post_id={post_id})\n\n"
                f"📝 지원서 내용:\n{answer_texts}"
            ),
            db=db,
        )

        db.commit()  # 🔧 추가됨: 위 알림/쪽지 작업을 하나의 트랜잭션으로 커밋 (누락 방지)
    finally:
        if close:
            db.close()



# ✅ 지원 승인/거절 결과 알림
def on_application_decided(application_id: int, applicant_id: int, accepted: bool, db: Optional[Session] = None):
    db, close = _get_db(db)
    try:
        typ = "APPLICATION_ACCEPTED" if accepted else "APPLICATION_REJECTED"
        msg = "지원이 승인되었습니다." if accepted else "지원이 거절되었습니다."
        send_notification(
            user_id=applicant_id,
            type_=typ,
            message=msg,
            related_id=application_id,
            db=db,
        )
        db.commit()
        logger.info(f"📩 지원 결과 알림 전송: {typ}")
    finally:
        if close:
            db.close()


# ✅ 신고 접수 시 관리자에게 알림
def on_report_created(report_id: int, reporter_user_id: int, db: Optional[Session] = None):
    db, close = _get_db(db)
    try:
        # 관리자들에게 알림
        for admin_id in _get_admin_ids(db):
            send_notification(
                user_id=admin_id,
                type_=NotificationType.REPORT_RECEIVED.value,
                message=f"신고가 접수되었습니다. (report_id={report_id})",
                related_id=report_id,
                redirect_path="/admin/reports",
                db=db,
            )

        # ✅ 신고자에게도 접수 알림
        send_notification(
            user_id=reporter_user_id,
            type_=NotificationType.REPORT_RECEIVED.value,  # 프론트 아이콘 매핑에 이미 존재
            message=f"신고가 접수되었습니다. (report_id={report_id})",
            related_id=report_id,
            redirect_path=None,
            db=db,
        )

        db.commit()
        logger.info(f"🚨 신고 접수 알림 전송 완료: report_id={report_id}")
    finally:
        if close:
            db.close()

# ✅ 신고 처리 결과 알림
def on_report_resolved(
    report_id: int,
    reporter_user_id: int,
    resolved: bool,
    db: Optional[Session] = None,
):
    """
    🚨 신고 처리 완료 시 내부 로그용 알림 이벤트
    - 이미 admin_service.resolve_report 에서 알림/쪽지 발송 완료
    - 여기서는 단순히 기록 및 시스템 로그만 남김
    """
    db, close = _get_db(db)
    try:
        typ = "REPORT_RESOLVED" if resolved else "REPORT_REJECTED"
        # ❌ send_notification(...) 호출 제거
        logger.info(f"✅ 신고 처리 완료 이벤트: report_id={report_id}, type={typ}, reporter={reporter_user_id}")
        db.commit()
    finally:
        if close:
            db.close()