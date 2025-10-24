# app/events/events.py
# ✅ 이벤트 허브: 서비스/라우터에서 이 함수들만 호출하세요.
from typing import Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.notifications.notification_service import send_notification
from app.messages.message_service import send_message
from app.notifications.notification_model import NotificationType, NotificationCategory
from app.messages.message_model import MessageCategory  # ✅ 추가
# 🩵 [10/20 추가] 신고 처리 결과 알림 통합 함수 사용 (admin_service 연동 통일)
from app.notifications.notification_service import notify_report_result 

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


# ✅ [10/19수정]게시글 생성 시 관리자에게 승인 요청 알림
def on_post_submitted(post_id: int, leader_id: int, db: Optional[Session] = None):
    """
    프로젝트/스터디 게시글 생성 시 관리자에게 승인 대기 알림 전송
    """
    db, close = _get_db(db)
    try:
        # 게시글 정보 가져오기 (type, title)
        post_info = db.execute(text("""
            SELECT type, title FROM posts WHERE id=:pid
        """), {"pid": post_id}).mappings().first()

        post_type = post_info["type"].upper() if post_info else "PROJECT"
        title = post_info["title"] if post_info else "(제목 없음)"

        # 🔹 관리자 알림: 프로젝트/스터디 승인 대기
        for admin_id in _get_admin_ids(db):
            send_notification(
                user_id=admin_id,
                type_=NotificationType.APPLICATION.value,
                message=f"새로운 {post_type} 승인 대기 게시글이 있습니다.\n제목: {title}",
                related_id=post_id,
                redirect_path="/admin/pending",
                category=NotificationCategory.ADMIN.value,
                db=db,
            )

        db.commit()
        logger.info(f"📨 관리자 승인 대기 알림 전송 완료: post_id={post_id}, type={post_type}")
    finally:
        if close:
            db.close()

# ✅ [10/19수정] 게시글 승인 시 리더에게 승인 알림
def on_post_approved(post_id: int, leader_id: int, db: Optional[Session] = None):
    db, close = _get_db(db)
    try:
        send_notification(
            user_id=leader_id,
            type_=NotificationType.APPLICATION_ACCEPTED.value,  # 🔧 APPLICATION → APPLICATION_ACCEPTED
            message=f"게시글 #{post_id}이 승인되었습니다.",         # 🔧 메시지 통일
            related_id=post_id,
            redirect_path=None,                                   # 🔧 이동 없음 (클릭 시 읽음만)
            category=NotificationCategory.ADMIN.value,            # 🔧 관리자 카테고리로 고정
            db=db,
        )
        db.commit()
        logger.info(f"✅ 게시글 승인 알림 전송(단일): post_id={post_id}, leader_id={leader_id}")
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
    """
    지원서 제출 시 리더에게 알림 + 쪽지 자동 발송
    """
    db, close = _get_db(db)
    try:
        # 지원서 답변들 불러오기
        answers = db.execute(text("""
            SELECT f.name AS field_name, a.answer_text
            FROM application_answers a
            JOIN application_fields f ON a.field_id = f.id
            WHERE a.application_id = :app_id
        """), {"app_id": application_id}).mappings().all()

        # 답변 내용을 보기 좋게 구성
        if answers:
            answer_texts = "\n".join(
                [f"- {row['field_name']}: {row['answer_text']}" for row in answers]
            )
        else:
            answer_texts = "(답변 내용 없음)"

        # 리더에게 알림
        send_notification(
            user_id=leader_id,
            type_=NotificationType.APPLICATION.value,
            message=f"📨 새로운 지원서가 도착했습니다. (application_id={application_id}, post_id={post_id})",
            related_id=application_id,
            db=db,
        )

        content = (
        f"📩 [새로운 지원서 제출]\n\n"
        f"application_id={application_id}\n"
        f"post_id={post_id}\n\n"
        f"🧾 지원 내용:\n{answer_texts}\n\n"
        )

        send_message(
            sender_id=applicant_id,
            receiver_id=leader_id,
            content=content,
            db=db,
            category=MessageCategory.NORMAL.value,
        )

        db.commit()
        logger.info(f"📨 지원서 제출 쪽지 발송 완료: app_id={application_id}, post_id={post_id}")

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
    """
    ✅ 변경 내용 요약:
    - 기존: 관리자 + 신고자 모두에게 알림 (중복 발생)
    - 수정: 관리자에게만 REPORT_RECEIVED 알림 전송
    - 신고자 알림은 create_report() 내부에서 즉시 전송 (redirect_path 없음)
    - 결과: 신고자는 즉시 알림 1개만 받고, 클릭해도 이동 없음
    """
    db, close = _get_db(db)
    try:
        # 🔹 관리자 알림만 발송 (신고자 알림은 report_service에서 처리)
        for admin_id in _get_admin_ids(db):
            send_notification(
                user_id=admin_id,
                type_=NotificationType.REPORT_RECEIVED.value,
                message=f"새로운 신고(ID:{report_id})가 접수되었습니다.",
                related_id=report_id,
                redirect_path="/admin/reports",  # ✅ 관리자만 이동 가능
                category=NotificationCategory.ADMIN.value,
                db=db,
            )

        # 🚫 신고자 알림 제거 (중복 방지)
        db.commit()
        logger.info(f"🚨 관리자 신고 알림 전송 완료 (report_id={report_id}, reporter={reporter_user_id})")
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
    db, close = _get_db(db)
    try:
        typ = "REPORT_RESOLVED" if resolved else "REPORT_REJECTED"
        logger.info(f"✅ 신고 처리 완료 이벤트: report_id={report_id}, type={typ}, reporter={reporter_user_id}")

        # 🩵 [10/20 추가] notify_report_result 연동 (admin_service의 처리 결과와 동기화)
        notify_report_result(
            reporter_id=reporter_user_id,
            report_id=report_id,
            resolved=resolved,
            db=db,
        )

        db.commit()
    finally:
        if close:
            db.close()
