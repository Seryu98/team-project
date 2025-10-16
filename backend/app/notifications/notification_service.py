# app/notifications/notification_service.py
# ✅ 알림 생성/조회/읽음 처리 서비스 (SQLAlchemy 세션 직접 사용)
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.notifications.notification_model import NotificationCategory
from app.messages.message_model import MessageCategory

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
# ✅ 알림 전송
# ----------------------------
def send_notification(
    user_id: int,
    type_: str,
    message: str,
    related_id: Optional[int] = None,
    redirect_path: Optional[str] = None,
    db: Optional[Session] = None,
    category: Optional[str] = None,
) -> int:
    """
    알림 전송
    - 기본은 USER 카테고리
    - category 지정 시 ADMIN / SYSTEM 알림도 가능
    """
    db, close = _get_db(db)
    try:
        ## 🔧 수정됨: 기본 카테고리 값을 NotificationCategory.USER 로 설정
        category_value = category or NotificationCategory.USER.value

        result = db.execute(
            text("""
                INSERT INTO notifications (
                    user_id, type, message, related_id, redirect_path, is_read, created_at, category
                )
                VALUES (
                    :user_id, :type, :message, :related_id, :redirect_path, 0, NOW(), :category
                )
            """),
            {
                "user_id": user_id,
                "type": type_,
                "message": message,
                "related_id": related_id,
                "redirect_path": redirect_path,
                "category": category_value,
            }
        )
        db.commit()

        ## ✅ 새로 추가된 안전한 lastrowid 처리
        inserted_id = (
            result.lastrowid
            if hasattr(result, "lastrowid")
            else db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        )
        return int(inserted_id)
    finally:
        if close:
            db.close()

# ----------------------------
# ✅ 알림 목록 조회
# ----------------------------
def list_notifications(
    user_id: int,
    only_unread: bool = False,
    limit: int = 50,
    db: Optional[Session] = None,
    category: Optional[str] = None,
) -> List[dict]:
    """
    알림 목록 조회
    - only_unread=True → 읽지 않은 알림만
    - category=USER|ADMIN|SYSTEM 필터 가능
    """
    db, close = _get_db(db)
    try:
        sql = """
            SELECT id, type, message, related_id, redirect_path, is_read, created_at, category
            FROM notifications
            WHERE user_id=:user_id
        """
        if only_unread:
            sql += " AND is_read=0"

        if category:
            sql += " AND category=:category"

        sql += " ORDER BY id DESC LIMIT :limit"

        rows = db.execute(
            text(sql),
            {
                "user_id": user_id,
                "limit": limit,
                ## 🔧 수정됨: 기본 필터값 USER 로 변경
                "category": category or NotificationCategory.USER.value,
            },
        ).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()

# ----------------------------
# ✅ 알림 읽음 처리
# ----------------------------
def mark_read(user_id: int, notification_ids: List[int], db: Optional[Session] = None) -> int:
    """
    선택한 알림을 읽음 처리
    """
    if not notification_ids:
        return 0
    db, close = _get_db(db)
    try:
        sql = """
            UPDATE notifications
               SET is_read=1
             WHERE user_id=:user_id
               AND id IN ({ids})
        """.format(ids=",".join(str(int(i)) for i in notification_ids))
        result = db.execute(text(sql), {"user_id": user_id})
        db.commit()
        return result.rowcount or 0
    finally:
        if close:
            db.close()

# ----------------------------
# ✅ 안 읽은 알림 수 조회
# ----------------------------
def unread_count(user_id: int, db: Optional[Session] = None) -> int:
    """
    읽지 않은 알림 개수 반환
    """
    db, close = _get_db(db)
    try:
        cnt = db.execute(
            text("""
                SELECT COUNT(*)
                  FROM notifications
                 WHERE user_id=:user_id
                   AND is_read=0
            """),
            {"user_id": user_id},
        ).scalar()
        return int(cnt or 0)
    finally:
        if close:
            db.close()