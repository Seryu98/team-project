# app/notifications/notification_service.py
# ✅ 알림 생성/조회/읽음 처리 서비스 (SQLAlchemy 세션 직접 사용)
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close


# ✅ 알림 전송
def send_notification(user_id: int, type_: str, message: str, related_id: Optional[int] = None, db: Optional[Session] = None) -> int:
    db, close = _get_db(db)
    try:
        result = db.execute(text("""
            INSERT INTO notifications (user_id, type, message, related_id, is_read, created_at)
            VALUES (:user_id, :type, :message, :related_id, 0, NOW())
        """), {
            "user_id": user_id,
            "type": type_,
            "message": message,
            "related_id": related_id
        })
        db.commit()

        inserted_id = (
            result.lastrowid
            if hasattr(result, "lastrowid")
            else db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        )
        return int(inserted_id)
    finally:
        if close:
            db.close()


# ✅ 알림 목록 조회
def list_notifications(user_id: int, only_unread: bool = False, limit: int = 50, db: Optional[Session] = None) -> List[dict]:
    db, close = _get_db(db)
    try:
        sql = """
        SELECT id, type, message, related_id, is_read, created_at
        FROM notifications
        WHERE user_id=:user_id
        {unread_filter}
        ORDER BY id DESC
        LIMIT :limit
        """.format(unread_filter="AND is_read=0" if only_unread else "")
        rows = db.execute(text(sql), {"user_id": user_id, "limit": limit}).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()


# ✅ 알림 읽음 처리
def mark_read(user_id: int, notification_ids: List[int], db: Optional[Session] = None) -> int:
    if not notification_ids:
        return 0
    db, close = _get_db(db)
    try:
        sql = """
        UPDATE notifications SET is_read=1
        WHERE user_id=:user_id AND id IN ({ids})
        """.format(ids=",".join(str(int(i)) for i in notification_ids))
        result = db.execute(text(sql), {"user_id": user_id})
        db.commit()
        return result.rowcount or 0
    finally:
        if close:
            db.close()


# ✅ 안 읽은 알림 수 조회
def unread_count(user_id: int, db: Optional[Session] = None) -> int:
    db, close = _get_db(db)
    try:
        cnt = db.execute(text("""
            SELECT COUNT(*) FROM notifications WHERE user_id=:user_id AND is_read=0
        """), {"user_id": user_id}).scalar()
        return int(cnt or 0)
    finally:
        if close:
            db.close()
