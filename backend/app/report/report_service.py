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
import logging

from app.core.database import get_db
from app.events.events import on_report_created
from app.notifications.notification_model import NotificationType
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
) -> dict:  # 🔧 수정됨: 반환타입 명시
    """
    신고 생성 로직
    - 신고자/피신고자 ID 자동 처리
    - 중복 신고 방지
    - 관리자 알림 이벤트 트리거
    """
    db, close = _get_db(db)
    try:
        # 신고 대상 사용자 찾기
        reported_user_id = _resolve_reported_user_id(db, target_type, target_id)
        if not reported_user_id:
            raise HTTPException(status_code=404, detail="신고 대상이 존재하지 않습니다.")

        # 자기 자신 신고 방지
        if reporter_user_id == reported_user_id:
            raise HTTPException(status_code=400, detail="본인을 신고할 수 없습니다.")

        # 피신고자가 관리자이면 신고 불가
        role = db.execute(
            text("SELECT role FROM users WHERE id=:rid"),
            {"rid": reported_user_id},
        ).scalar()
        if role == "ADMIN":
            raise HTTPException(status_code=403, detail="관리자는 신고할 수 없습니다.")

        # ----------------------------
        # 🔧 중복 신고 방지 (오류 → 정상 응답)
        # ----------------------------
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
            return {
                "success": False,
                "message": "이미 신고한 대상입니다.",
                "already_reported": True
            }

        # 🚨 신고 등록
        db.execute(
            text("""
                INSERT INTO reports (reported_user_id, reporter_user_id, target_type, target_id, reason, status)
                VALUES (:ru, :r, :tt, :tid, :reason, 'PENDING')
            """),
            {
                "ru": reported_user_id,
                "r": reporter_user_id,
                "tt": target_type,
                "tid": target_id,
                "reason": reason.strip(),
            },
        )
        db.flush()

        report_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        # ✅ 신고자에게 “신고 접수 알림” 전송
        try:
            send_notification(
                user_id=reporter_user_id,
                type_=NotificationType.REPORT_RECEIVED.value,
                message=f"신고가 접수되었습니다. (report_id={report_id})",
                related_id=int(report_id),
                redirect_path="/messages?tab=admin",
                category=MessageCategory.ADMIN.value,
                db=db,
            )

            # ✅ 관리자 쪽지함에도 등록
            admin_id = db.execute(
                text("SELECT id FROM users WHERE role='ADMIN' LIMIT 1")
            ).scalar()
            if admin_id:
                send_message(
                    sender_id=reporter_user_id,
                    receiver_id=admin_id,
                    content=f"[신고 접수] 사용자(ID:{reporter_user_id})가 {target_type} (ID:{target_id})를 신고했습니다.\n사유: {reason}",
                    db=db,
                    category=MessageCategory.ADMIN.value,
                )

            logger.info(f"📨 신고자 알림 전송 완료: report_id={report_id}, reporter_id={reporter_user_id}")
        except Exception as e:
            logger.error(f"🚨 신고자 알림 전송 실패: {e}")

        # 이벤트 트리거 (관리자 알림)
        try:
            on_report_created(report_id=int(report_id), reporter_user_id=reporter_user_id, db=db)
        except Exception as e:
            logger.error("🚨 신고 이벤트 트리거 실패: report_id=%s, err=%s", report_id, e)

        db.commit()
        logger.info(f"🚨 신고 생성 완료: id={report_id}, reporter={reporter_user_id}, target={target_type}({target_id})")

        # 🔧 성공 구조 통일
        return {
            "success": True,
            "message": "신고가 정상적으로 접수되었습니다.",
            "report_id": int(report_id)
        }

    finally:
        if close:
            db.close()

# ----------------------------
# 📋 내가 한 신고 목록
# ----------------------------
def list_my_reports(
    reporter_user_id: int,
    status: Optional[str] = None,
    limit: int = 50,
    db: Optional[Session] = None,
) -> List[Dict]:
    """
    신고 목록 조회
    - 상태별 필터 (PENDING, RESOLVED, REJECTED)
    - 최신순 정렬
    """
    db, close = _get_db(db)
    try:
        base_query = """
            SELECT id, target_type, target_id, reason, status, created_at
              FROM reports
             WHERE reporter_user_id = :r
        """
        if status:
            base_query += " AND status = :st"
        base_query += " ORDER BY id DESC LIMIT :lim"

        params = {"r": reporter_user_id, "st": status, "lim": limit}
        rows = db.execute(text(base_query), params).mappings().all()
        return [dict(r) for r in rows]

    finally:
        if close:
            db.close()

# ----------------------------
# 🔍 신고 상세 조회
# ----------------------------
def get_report_detail(
    report_id: int,
    requester_user_id: int,
    db: Optional[Session] = None,
) -> Optional[Dict]:
    """
    신고 상세조회
    - 본인 신고만 접근 가능
    - 관리자가 처리한 경우, 결과(승낙/거절 사유)도 함께 반환
    """
    db, close = _get_db(db)
    try:
        row = db.execute(
            text("""
                SELECT r.id, r.reported_user_id, r.reporter_user_id,
                       r.target_type, r.target_id, r.reason,
                       r.status, r.created_at,
                       ra.action AS resolved_action,
                       ra.reason AS resolved_reason,
                       ra.created_at AS resolved_at
                  FROM reports r
             LEFT JOIN report_actions ra ON ra.report_id = r.id
                 WHERE r.id = :rid
                   AND r.reporter_user_id = :uid
            """),
            {"rid": report_id, "uid": requester_user_id},
        ).mappings().first()
        return dict(row) if row else None

    finally:
        if close:
            db.close()

# ----------------------------
# ⚙️ 이미 신고했는지 여부
# ----------------------------
def has_already_reported(
    reporter_user_id: int,
    target_type: str,
    target_id: int,
    db: Optional[Session] = None,
) -> bool:
    """
    동일한 대상에 대해 이미 신고한 적이 있는지 확인
    (중복 신고 방지)
    """
    db, close = _get_db(db)
    try:
        exists = db.execute(
            text("""
                SELECT 1
                  FROM reports
                 WHERE reporter_user_id = :r
                   AND target_type = :tt
                   AND target_id = :tid
                   AND status = 'PENDING'
                 LIMIT 1
            """),
            {"r": reporter_user_id, "tt": target_type, "tid": target_id},
        ).scalar()
        return bool(exists)
    finally:
        if close:
            db.close()
