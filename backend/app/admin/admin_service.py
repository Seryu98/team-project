 # app/admin/admin_service.py
# ✅ 관리자 비즈니스 로직: 게시글 승인/거절, 신고 처리
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from datetime import datetime, timedelta
from app.core.database import get_db
from app.events.events import on_post_approved, on_report_resolved
from app.notifications.notification_service import send_notification
from app.notifications.notification_model import NotificationType
from app.messages.message_service import send_message
from app.messages.message_model import MessageCategory

# ✅ DB 세션 핸들러
def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close

# ✅ 게시글 승인
def approve_post(post_id: int, admin_id: int, db: Optional[Session] = None) -> bool:
    db, close = _get_db(db)
    try:
        updated = db.execute(
            text("UPDATE posts SET status='APPROVED' WHERE id=:pid"),
            {"pid": post_id},
        ).rowcount

        if not updated:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

        leader_id = db.execute(
            text("SELECT leader_id FROM posts WHERE id=:pid"), {"pid": post_id}
        ).scalar()

        db.commit()

        # ✅ 승인 알림 전송
        send_notification(
            user_id=leader_id,
            type_=NotificationType.APPLICATION_ACCEPTED.value,
            message=f"게시글 #{post_id}이 승인되었습니다.",
            related_id=post_id,
            redirect_path=f"/posts/{post_id}",
            category=MessageCategory.ADMIN.value, 
            db=db,
        )

        # ✅ 이벤트 트리거 (로그용)
        on_post_approved(post_id=post_id, leader_id=int(leader_id), db=db)
        return True

    finally:
        if close:
            db.close()

# ✅ 게시글 거절
def reject_post(post_id: int, admin_id: int, reason: Optional[str] = None, db: Optional[Session] = None) -> bool:
    db, close = _get_db(db)
    try:
        updated = db.execute(text("""
            UPDATE posts
               SET status='REJECTED',
                   recruit_status='CLOSED',
                   project_status='ENDED'
             WHERE id=:pid
        """), {"pid": post_id}).rowcount

        if not updated:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

        # 거절 사유 로그 기록
        if reason:
            db.execute(text("""
                INSERT INTO admin_actions (admin_id, post_id, action, reason)
                VALUES (:aid, :pid, 'REJECT', :reason)
            """), {"aid": admin_id, "pid": post_id, "reason": reason})

        # ✅ 작성자에게 거절 알림
        leader_id = db.execute(
            text("SELECT leader_id FROM posts WHERE id=:pid"), {"pid": post_id}
        ).scalar()
        if leader_id:
            send_notification(
                user_id=leader_id,
                type_=NotificationType.APPLICATION_REJECTED.value,
                message=f"게시글 #{post_id}이 거절되었습니다. 사유: {reason or '관리자에 의해 거절되었습니다.'}",
                related_id=post_id,
                redirect_path="/myposts",
                category=MessageCategory.ADMIN.value,
                db=db,
            )

        db.commit()
        return True

    finally:
        if close:
            db.close()

# ----------------------------
# ✅ 신고 처리
# ----------------------------
def resolve_report(
    report_id: int,
    admin_id: int,
    action: str,
    reason: Optional[str] = None,
    penalty_type: Optional[str] = None,
    db: Optional[Session] = None,
) -> bool:
    """
    ✅ 신고 처리 로직
    - action: 'RESOLVE' 또는 'REJECT'
    - penalty_type: 'WARNING', 'BAN_3DAYS', 'BAN_7DAYS', 'BAN_PERMANENT'
    - 관리자 사유 입력 + 제재 수위 선택 가능
    """
    if action not in {"RESOLVE", "REJECT"}:
        raise HTTPException(status_code=400, detail="action은 RESOLVE 또는 REJECT 중 하나여야 합니다.")

    db, close = _get_db(db)
    try:
        report = db.execute(text("""
            SELECT id, reporter_user_id, reported_user_id, target_type, target_id
              FROM reports
             WHERE id = :rid
        """), {"rid": report_id}).mappings().first()

        if not report:
            raise HTTPException(status_code=404, detail="신고 내역을 찾을 수 없습니다.")

        reporter_id = report["reporter_user_id"]
        reported_id = report["reported_user_id"]
        target_type = report["target_type"]
        target_id = report["target_id"]

        # 상태 업데이트
        status = "RESOLVED" if action == "RESOLVE" else "REJECTED"
        db.execute(text("UPDATE reports SET status=:st WHERE id=:rid"), {"st": status, "rid": report_id})

        # 처리 로그
        db.execute(text("""
            INSERT INTO report_actions (report_id, admin_id, action, reason)
            VALUES (:rid, :aid, :act, :reason)
        """), {"rid": report_id, "aid": admin_id, "act": action, "reason": reason or "(사유 없음)"})


        # 🚨 신고 승인 시
        if action == "RESOLVE":
            # --- 신고자 알림
            send_notification(
                user_id=reporter_id,
                type_=NotificationType.REPORT_RESOLVED.value,
                message=f"신고(ID:{report_id})가 승인되어 처리되었습니다.",
                related_id=report_id,
                redirect_path=None,
                category=MessageCategory.ADMIN.value,
                db=db,
            )

            # --- 피신고자 제재 쪽지
            penalty_msg = {
                "WARNING": "경고 조치되었습니다.",
                "BAN_3DAYS": "3일 정지되었습니다.",
                "BAN_7DAYS": "7일 정지되었습니다.",
                "BAN_PERMANENT": "영구 정지되었습니다.",
            }.get(penalty_type or "WARNING", "경고 조치되었습니다.")

            send_message(
                sender_id=admin_id,
                receiver_id=reported_id,
                content=f"[제재 안내]\n귀하의 {target_type} (ID:{target_id})가 신고되어 {penalty_msg}\n사유: {reason or '관리자 판단에 의한 제재입니다.'}",
                category=MessageCategory.ADMIN.value,
                db=db,
            )

            # ✅ 신고된 대상 삭제 (POST/COMMENT/쪽지 등)
            delete_map = {
                "POST": "posts",
                "BOARD_POST": "board_posts",
                "COMMENT": "comments",
                "MESSAGE": "messages",
            }
            if target_type in delete_map:
                db.execute(text(f"DELETE FROM {delete_map[target_type]} WHERE id=:tid"), {"tid": target_id})

            # ✅ 정지 처리 (기간 설정)
            suspend_until = None
            if penalty_type == "BAN_3DAYS":
                suspend_until = datetime.utcnow() + timedelta(days=3)
            elif penalty_type == "BAN_7DAYS":
                suspend_until = datetime.utcnow() + timedelta(days=7)
            elif penalty_type == "BAN_PERMANENT":
                suspend_until = datetime.utcnow() + timedelta(days=9999)

            if penalty_type and penalty_type != "WARNING":
                db.execute(text("""
                    UPDATE users
                       SET status = 'BANNED',
                           banned_until = :until    -- 🩵 수정됨: suspend_until → banned_until
                     WHERE id = :uid
                """), {"uid": reported_id, "until": suspend_until})

        # 🚫 신고 반려 시
        elif action == "REJECT":
            send_notification(
                user_id=reporter_id,
                type_=NotificationType.REPORT_REJECTED.value,
                message=f"신고(ID:{report_id})가 반려되었습니다.",
                related_id=report_id,
                redirect_path=None,
                category=MessageCategory.ADMIN.value,
                db=db,
            )

        # ✅ 이벤트 트리거 (로그용)
        on_report_resolved(
            report_id=report_id,
            reporter_user_id=reporter_id,
            resolved=(action == "RESOLVE"),
            db=db,
        )

        db.commit()
        return True

    finally:
        if close:
            db.close()

# ----------------------------
# ✅ 관리자 대시보드 통계
# ----------------------------
def get_admin_stats(db: Session):
    """관리자 대시보드용 통계 데이터"""
    result = {
        "pending_posts": db.execute(
            text("SELECT COUNT(*) FROM posts WHERE status='PENDING'")
        ).scalar() or 0,
        "pending_reports": db.execute(
            text("SELECT COUNT(*) FROM reports WHERE status='PENDING'")
        ).scalar() or 0,
    }
    return result

# ===============================================
# ✅ [🆕 추가됨] 제재 유저 관리
# ===============================================
def list_banned_users(db: Optional[Session] = None) -> list[dict]:
    """
    현재 밴 상태이거나 banned_until 이 미래인 사용자 목록
    """
    db, close = _get_db(db)
    try:
        rows = db.execute(text("""
            SELECT 
                u.id, u.nickname, u.email, u.role, u.status, u.banned_until,
                CASE 
                  WHEN u.banned_until IS NOT NULL AND u.banned_until > UTC_TIMESTAMP() THEN 1
                  WHEN u.status = 'BANNED' THEN 1
                  ELSE 0
                END AS is_currently_banned
            FROM users u
            WHERE 
              (u.status = 'BANNED')
              OR (u.banned_until IS NOT NULL AND u.banned_until > UTC_TIMESTAMP())
            ORDER BY COALESCE(u.banned_until, '9999-12-31') DESC, u.id DESC
        """)).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()

def ban_user(
    target_user_id: int,
    admin_id: int,
    days: Optional[int] = None,   # None이면 영구
    reason: Optional[str] = None,
    db: Optional[Session] = None,
) -> bool:
    """
    관리자 수동 밴:
    - days: 정지 일수 (None이면 영구)
    """
    db, close = _get_db(db)
    try:
        exists = db.execute(text("SELECT COUNT(*) FROM users WHERE id=:uid"), {"uid": target_user_id}).scalar()
        if not exists:
            raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")

        until = datetime.utcnow() + timedelta(days=9999 if days is None else int(days))

        # 🩵 수정됨: banned_until 컬럼 사용
        db.execute(text("""
            UPDATE users
               SET status='BANNED',
                   banned_until=:until
             WHERE id=:uid
        """), {"uid": target_user_id, "until": until})

        # 알림 & 쪽지 (관리자 카테고리)
        send_notification(
            user_id=target_user_id,
            type_=NotificationType.BAN.value,
            message=f"계정이 제재되었습니다. ({'영구' if days is None else f'{days}일'})",
            related_id=None,
            redirect_path=None,
            db=db,
        )
        send_message(
            sender_id=admin_id,
            receiver_id=target_user_id,
            content=f"[제재 안내]\n관리자에 의해 계정이 {'영구' if days is None else f'{days}일'} 정지되었습니다.\n사유: {reason or '(사유 없음)'}",
            db=db,
            category=MessageCategory.ADMIN.value,
        )

        db.commit()
        return True
    finally:
        if close:
            db.close()

def unban_user(
    target_user_id: int,
    admin_id: int,
    reason: Optional[str] = None,
    db: Optional[Session] = None,
) -> bool:
    """
    관리자 수동 해제:
    - status='ACTIVE', banned_until=NULL
    """
    db, close = _get_db(db)
    try:
        updated = db.execute(text("""
            UPDATE users
               SET status='ACTIVE',
                   banned_until=NULL
             WHERE id=:uid
        """), {"uid": target_user_id}).rowcount

        if not updated:
            raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")

        # 알림 & 쪽지
        send_notification(
            user_id=target_user_id,
            type_=NotificationType.UNBAN.value,
            message="계정 제재가 해제되었습니다.",
            related_id=None,
            redirect_path=None,
            db=db,
        )
        send_message(
            sender_id=admin_id,
            receiver_id=target_user_id,
            content=f"[제재 해제 안내]\n계정 제재가 해제되었습니다.\n비고: {reason or '(없음)'}",
            db=db,
            category=MessageCategory.ADMIN.value,
        )

        db.commit()
        return True
    finally:
        if close:
            db.close()