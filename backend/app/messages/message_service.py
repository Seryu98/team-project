# app/messages/message_service.py
# ✅ 메시지 송수신/읽음 처리 서비스 (raw SQL + text() 스타일)
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.notifications.notification_service import send_notification
from app.users.user_model import User
from fastapi import HTTPException
import re
from app.messages.message_model import MessageCategory

# ✅ DB 세션 핸들러

def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close

# ---------------------------------------------------------------------
# ✅ 메시지 전송
# ---------------------------------------------------------------------
def send_message(
    sender_id: int,
    receiver_id: int,
    content: str,
    db: Optional[Session] = None,
    category: str = MessageCategory.NORMAL.value,
) -> int:
    db, close = _get_db(db)
    try:
        # ✅ 관리자 또는 실제 유저 존재 확인
        sender_exists = db.execute(
            text("SELECT COUNT(*) FROM users WHERE id=:sid"),
            {"sid": sender_id}
        ).scalar()
        if not sender_exists:
            raise HTTPException(status_code=400, detail=f"잘못된 발신자 ID입니다: {sender_id}")

        # ✅ 쪽지 저장
        result = db.execute(text("""
            INSERT INTO messages(sender_id, receiver_id, content, is_read, category)
            VALUES (:s, :r, :c, 0, :cat)
        """), {"s": sender_id, "r": receiver_id, "c": content, "cat": category})
        db.flush()

        message_id = (
            result.lastrowid
            if hasattr(result, "lastrowid") and result.lastrowid
            else db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        )

        # ✅ 송신/수신자 상태 테이블 업데이트
        db.execute(text("""
            INSERT INTO message_user_status (message_id, user_id, is_read)
            VALUES (:m, :sender, 1), (:m, :receiver, 0)
        """), {"m": message_id, "sender": sender_id, "receiver": receiver_id})

        db.commit()

        # ✅ 해당 쪽지에 대한 알림 발송
        send_notification(
            user_id=receiver_id,
            type_="MESSAGE",
            message="새 메시지가 도착했습니다.",
            related_id=message_id,
            redirect_path=f"/messages/{message_id}",
            category=category,  # ✅ 추가됨: 카테고리 전달
            db=db
        )

        return int(message_id)
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# 닉네임 기반 메시지 전송
# ---------------------------------------------------------------------
def send_message_by_nickname(
    sender_id: int,
    receiver_nickname: str,
    content: str,
    db: Optional[Session] = None,
) -> int:
    """닉네임으로 수신자 조회 후 쪽지 전송"""
    db, close = _get_db(db)
    try:
        receiver = db.query(User).filter(User.nickname == receiver_nickname).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="존재하지 않는 사용자입니다.")

        if receiver.id == sender_id:
            raise HTTPException(status_code=400, detail="자기 자신에게 쪽지를 보낼 수 없습니다.")

        return send_message(
            sender_id=sender_id,
            receiver_id=receiver.id,
            content=content,
            db=db,
            category=MessageCategory.NORMAL.value,
        )
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 수신함 목록
# ---------------------------------------------------------------------
def list_inbox(
    user_id: int,
    limit: int = 50,
    db: Optional[Session] = None,
    category: str = MessageCategory.NORMAL.value,  # ✅ 필터 확장
) -> List[Dict]:
    db, close = _get_db(db)
    try:
        rows = db.execute(text(f"""
            SELECT 
                m.id, m.sender_id, sender.nickname AS sender_nickname,
                m.receiver_id, receiver.nickname AS receiver_nickname,
                m.content, m.is_read, m.created_at, m.category
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.receiver_id = :u
              AND m.category = :cat
            ORDER BY m.id DESC
            LIMIT :limit
        """), {"u": user_id, "limit": limit, "cat": category}).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 관리자 쪽지함 (ADMIN 카테고리용)
# ---------------------------------------------------------------------
def list_admin_messages(user_id: int, limit: int = 50, db: Optional[Session] = None) -> List[Dict]:
    """
    관리자(Admin) 카테고리 쪽지함 전용
    """
def list_admin_messages(user_id: int, limit: int = 50, db: Optional[Session] = None) -> List[Dict]:
    return list_inbox(user_id=user_id, limit=limit, db=db, category=MessageCategory.ADMIN.value)

# ---------------------------------------------------------------------
# ✅ 보낸함 목록 (내가 보낸 쪽지)
# ---------------------------------------------------------------------
def list_sent(user_id: int, limit: int = 50, db: Optional[Session] = None) -> List[Dict]:
    db, close = _get_db(db)
    try:
        rows = db.execute(text("""
            SELECT 
                m.id, m.sender_id, sender.nickname AS sender_nickname,
                m.receiver_id, receiver.nickname AS receiver_nickname,
                m.content, m.is_read, m.created_at, m.category
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.sender_id = :u
            ORDER BY m.id DESC
            LIMIT :limit
        """), {"u": user_id, "limit": limit}).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 단일 메시지 조회 (상세)
# ---------------------------------------------------------------------
def get_message(user_id: int, message_id: int, db: Optional[Session] = None) -> Optional[Dict]:
    db, close = _get_db(db)
    try:
        row = db.execute(text("""
            SELECT 
                m.id, m.sender_id, sender.nickname AS sender_nickname,
                m.receiver_id, receiver.nickname AS receiver_nickname,
                m.content, m.is_read, m.created_at, m.category
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.id = :mid
              AND (m.sender_id = :u OR m.receiver_id = :u)
        """), {"mid": message_id, "u": user_id}).mappings().first()

        if not row:
            return None

        data = dict(row)
        data["application_status"] = None
        app_id = _extract_application_id(data.get("content"))
        if app_id:
            data["application_status"] = db.execute(
                text("SELECT status FROM applications WHERE id=:aid"),
                {"aid": app_id}
            ).scalar()

        return data
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 메시지 읽음 처리
# ---------------------------------------------------------------------
def mark_read(user_id: int, message_id: int, db: Optional[Session] = None) -> bool:
    db, close = _get_db(db)
    try:
        db.execute(text("""
            UPDATE messages SET is_read = 1
             WHERE id = :mid AND receiver_id = :u
        """), {"mid": message_id, "u": user_id})

        db.execute(text("""
            UPDATE message_user_status
               SET is_read = 1, read_at = NOW()
             WHERE message_id = :mid AND user_id = :u
        """), {"mid": message_id, "u": user_id})

        # ✅ 2) 📩 알림 읽음 처리 (MESSAGE 알림 자동 동기화)
        db.execute(text("""
            UPDATE notifications
               SET is_read = 1
             WHERE user_id = :u
               AND type = 'MESSAGE'
               AND related_id = :mid
        """), {"u": user_id, "mid": message_id})

        db.commit()
        return True
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# 🔎 유틸: 메시지 본문에서 application_id / post_id 파싱
# ---------------------------------------------------------------------
def _extract_application_id(content: Optional[str]) -> Optional[int]:
    if not content:
        return None
    m = re.search(r"application_id=(\d+)", content)
    return int(m.group(1)) if m else None


def _extract_post_id(content: Optional[str]) -> Optional[int]:
    if not content:
        return None
    m = re.search(r"post_id=(\d+)", content)
    return int(m.group(1)) if m else None
