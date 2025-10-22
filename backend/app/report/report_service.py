# app/report/report_service.py
"""
✅ 신고 관련 서비스 로직 (최신 구조)
- 일반 사용자: 신고 생성 / 조회 / 중복검사
- 관리자: 신고 처리 (승낙·거절)
- 연동: events.on_report_created / admin_service.resolve_report
- DB: reports, report_actions
"""

from typing import Optional, List, Dict, Literal
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from datetime import datetime  # 🩵 [추가] UTC 시간 기록용
import logging

from app.core.database import get_db
from app.events.events import on_report_created
from app.notifications.notification_model import NotificationType, NotificationCategory  # 🩵 [수정] NotificationCategory 추가
from app.notifications.notification_service import send_notification
from app.messages.message_service import send_message
from app.messages.message_model import MessageCategory

logger = logging.getLogger(__name__)

TargetType = Literal["POST", "BOARD_POST", "COMMENT", "USER", "MESSAGE"]

# ----------------------------
# ✅ DB 세션 핸들러
# ----------------------------
def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close


# ----------------------------
# ✅ 신고 대상 사용자 ID 자동 탐색
# ----------------------------
def _resolve_reported_user_id(db: Session, target_type: str, target_id: int) -> Optional[int]:
    if target_type == "USER":
        return target_id
    elif target_type == "POST":
        return db.execute(text("SELECT leader_id FROM posts WHERE id=:pid"), {"pid": target_id}).scalar()
    elif target_type == "BOARD_POST":
        return db.execute(text("SELECT author_id FROM board_posts WHERE id=:bid"), {"bid": target_id}).scalar()
    elif target_type == "COMMENT":
        return db.execute(text("SELECT user_id FROM comments WHERE id=:cid"), {"cid": target_id}).scalar()
    elif target_type == "MESSAGE":
        return db.execute(text("SELECT sender_id FROM messages WHERE id=:mid"), {"mid": target_id}).scalar()
    return None


# ----------------------------
# 🚨 신고 생성
# ----------------------------
def create_report(
    reporter_user_id: int,
    target_type: TargetType,
    target_id: int,
    reason: str,
    db: Optional[Session] = None,
) -> dict:
    """
    ✅ 신고 생성 로직
    - 신고자/피신고자 ID 자동 처리
    - 중복 신고 방지
    - 관리자 알림 및 쪽지 발송
    """
    db, close = _get_db(db)
    try:
        # ✅ 신고 대상 사용자 찾기
        reported_user_id = _resolve_reported_user_id(db, target_type, target_id)
        if not reported_user_id:
            raise HTTPException(status_code=404, detail="신고 대상이 존재하지 않습니다.")

        # ✅ 자기 자신 신고 방지
        if reporter_user_id == reported_user_id:
            raise HTTPException(status_code=400, detail="본인을 신고할 수 없습니다.")

        # ✅ 피신고자가 관리자면 신고 불가
        role = db.execute(text("SELECT role FROM users WHERE id=:rid"), {"rid": reported_user_id}).scalar()
        if role == "ADMIN":
            raise HTTPException(status_code=403, detail="관리자는 신고할 수 없습니다.")

        # ✅ 중복 신고 방지
        duplicate = db.execute(
            text("""
                SELECT id FROM reports
                 WHERE reporter_user_id = :r
                   AND target_type = :tt
                   AND target_id = :tid
                   AND status = 'PENDING'
                 LIMIT 1
            """),
            {"r": reporter_user_id, "tt": target_type, "tid": target_id},
        ).scalar()
        if duplicate:
            logger.warning(f"⚠️ 중복 신고 감지: reporter={reporter_user_id}, target={target_type}({target_id})")
            return {"success": False, "message": "이미 신고한 대상입니다.", "already_reported": True}

        # ✅ 신고 등록 (UTC 기준)
        db.execute(
            text("""
                INSERT INTO reports (reported_user_id, reporter_user_id, target_type, target_id, reason, status, created_at)
                VALUES (:ru, :r, :tt, :tid, :reason, 'PENDING', UTC_TIMESTAMP())
            """),
            {"ru": reported_user_id, "r": reporter_user_id, "tt": target_type, "tid": target_id, "reason": reason.strip()},
        )
        db.flush()
        report_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        # ===============================
        # 🩵 신고자 알림 & 관리자 알림 (쪽지 제거)
        # ===============================
        try:
            # 🚨 신고자 알림 (즉시, redirect 없음)
            send_notification(
                user_id=reporter_user_id,
                type_=NotificationType.REPORT_RECEIVED.value,
                message="🚨 신고가 접수되었습니다.",
                related_id=int(report_id),
                redirect_path=None,
                category=NotificationCategory.NORMAL.value,
                db=db,
            )

            # 🚨 관리자 알림 (대시보드용)
            admin_id = db.execute(text("SELECT id FROM users WHERE role='ADMIN' LIMIT 1")).scalar()
            if admin_id:
                send_notification(
                    user_id=admin_id,
                    type_=NotificationType.REPORT_RECEIVED.value,
                    message=f"신고(ID:{report_id})가 접수되었습니다.",
                    related_id=int(report_id),
                    redirect_path="/admin/reports",  # 🩵 클릭 시 대시보드 신고 관리 페이지
                    category=NotificationCategory.ADMIN.value,
                    db=db,
                )

            logger.info(f"📨 신고 접수 완료: report_id={report_id}, reporter={reporter_user_id}")

        except Exception as e:
            logger.error(f"🚨 신고자 또는 관리자 알림 전송 실패: {e}")


        # 🩵 [수정] 이벤트 트리거 제거 (중복 및 딜레이 원인)
        # ❌ on_report_created(report_id=int(report_id), reporter_user_id=reporter_user_id, db=db)

        db.commit()
        return {"success": True, "message": "신고가 정상적으로 접수되었습니다.", "report_id": int(report_id)}

    finally:
        if close:
            db.close()

# ----------------------------
# ✅ 중복 신고 여부 확인
# ----------------------------
def has_already_reported(db: Session, reporter_user_id: int, target_type: str, target_id: int) -> bool:
    """✅ 동일 대상에 대한 중복 신고 여부 검사"""
    exists = db.execute(
        text("""
            SELECT COUNT(*) FROM reports
             WHERE reporter_user_id=:r
               AND target_type=:tt
               AND target_id=:tid
               AND status='PENDING'
        """),
        {"r": reporter_user_id, "tt": target_type, "tid": target_id},
    ).scalar()
    return bool(exists)

# ----------------------------
# ✅ 내가 작성한 신고 목록 조회
# ----------------------------
def list_my_reports(db: Session, reporter_user_id: int, status: Optional[str] = None, limit: int = 50) -> List[Dict]:
    """📋 내가 작성한 신고 목록 조회"""
    sql = """
        SELECT r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at,
               u.nickname AS reported_nickname
          FROM reports r
          JOIN users u ON u.id = r.reported_user_id
         WHERE r.reporter_user_id = :rid
    """
    if status:
        sql += " AND r.status = :st"
    sql += " ORDER BY r.created_at DESC LIMIT :lim"

    params = {"rid": reporter_user_id, "lim": limit}
    if status:
        params["st"] = status

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]

# ----------------------------
# ✅ 신고 상세 조회
# ----------------------------
def get_report_detail(db: Session, report_id: int, requester_user_id: int) -> Optional[Dict]:
    """🔍 특정 신고 상세 조회"""
    row = db.execute(
        text("""
            SELECT r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at,
                   ru.nickname AS reporter_nickname,
                   tu.nickname AS reported_nickname
              FROM reports r
              JOIN users ru ON ru.id = r.reporter_user_id
              JOIN users tu ON tu.id = r.reported_user_id
             WHERE r.id = :rid
               AND r.reporter_user_id = :uid
        """),
        {"rid": report_id, "uid": requester_user_id},
    ).mappings().first()

    return dict(row) if row else None