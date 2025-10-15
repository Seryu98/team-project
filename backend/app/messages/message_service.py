# app/messages/message_service.py
# ✅ 메시지 송수신/읽음 처리 서비스 (raw SQL + text() 스타일)
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.notifications.notification_service import send_notification
from app.users.user_model import User  # 🚀 추가됨
from fastapi import HTTPException
import re

def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close

# ---------------------------------------------------------------------
# ✅ 메시지 전송
#   - messages 에 본문 저장
#   - message_user_status 에 수신자 읽음 상태 저장
#   - 알림도 발송 (type="MESSAGE")
# ---------------------------------------------------------------------
def send_message(sender_id: int, receiver_id: int, content: str, db: Optional[Session] = None) -> int:
    db, close = _get_db(db)
    try:
        result = db.execute(text("""
            INSERT INTO messages(sender_id, receiver_id, content, is_read)
            VALUES (:s, :r, :c, 0)
        """), {"s": sender_id, "r": receiver_id, "c": content})
        db.flush()

        message_id = result.lastrowid if hasattr(result, "lastrowid") and result.lastrowid else \
                     db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        # ✅ 발신자 / 수신자 상태 모두 등록
        db.execute(text("""
            INSERT INTO message_user_status (message_id, user_id, is_read)
            VALUES (:m, :sender, 1), (:m, :receiver, 0)
        """), {"m": message_id, "sender": sender_id, "receiver": receiver_id})

        db.commit()

        # 알림
        send_notification(
            user_id=receiver_id,
            type_="MESSAGE",
            message="새 메시지가 도착했습니다.",
            related_id=message_id,
            db=db
        )
        return int(message_id)
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# 🚀 추가됨: 닉네임 기반 메시지 전송
# ---------------------------------------------------------------------
def send_message_by_nickname(sender_id: int, receiver_nickname: str, content: str, db: Optional[Session] = None) -> int:
    """
    닉네임으로 수신자 조회 후 쪽지 전송
    """
    db, close = _get_db(db)
    try:
        receiver = db.query(User).filter(User.nickname == receiver_nickname).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="존재하지 않는 사용자입니다.")

        if receiver.id == sender_id:
            raise HTTPException(status_code=400, detail="자기 자신에게 쪽지를 보낼 수 없습니다.")

        return send_message(sender_id=sender_id, receiver_id=receiver.id, content=content, db=db)
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 수신함 목록
# ---------------------------------------------------------------------
def list_inbox(user_id: int, limit: int = 50, db: Optional[Session] = None) -> List[Dict]:
    db, close = _get_db(db)
    try:
        rows = db.execute(text("""
            SELECT 
                m.id,
                m.sender_id,
                sender.nickname AS sender_nickname,  -- 🚀 추가됨
                m.receiver_id,
                receiver.nickname AS receiver_nickname,  -- 🚀 추가됨
                m.content,
                m.is_read,
                m.created_at
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.receiver_id = :u
            ORDER BY m.id DESC
            LIMIT :limit
        """), {"u": user_id, "limit": limit}).mappings().all()

        items: List[Dict] = [dict(r) for r in rows]
        return items
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 보낸함 목록 (내가 보낸 쪽지)
# ---------------------------------------------------------------------
def list_sent(user_id: int, limit: int = 50, db: Optional[Session] = None) -> List[Dict]:
    db, close = _get_db(db)
    try:
        rows = db.execute(text("""
            SELECT 
                m.id,
                m.sender_id,
                sender.nickname AS sender_nickname,  -- 🚀 추가됨
                m.receiver_id,
                receiver.nickname AS receiver_nickname,  -- 🚀 추가됨
                m.content,
                m.is_read,
                m.created_at
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
                m.id,
                m.sender_id,
                sender.nickname AS sender_nickname,  -- 🚀 추가됨
                m.receiver_id,
                receiver.nickname AS receiver_nickname,  -- 🚀 추가됨
                m.content,
                m.is_read,
                m.created_at
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.id = :mid
              AND (m.sender_id = :u OR m.receiver_id = :u)
        """), {"mid": message_id, "u": user_id}).mappings().first()

        if not row:
            return None

        data = dict(row)
        # ✅ application_id 파싱 → 상태 조회
        application_id = _extract_application_id(data.get("content"))
        application_status = None
        if application_id:
            application_status = db.execute(
                text("SELECT status FROM applications WHERE id=:aid"),
                {"aid": application_id}
            ).scalar()

        data["application_status"] = application_status
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
            UPDATE messages
               SET is_read = 1
             WHERE id = :mid AND receiver_id = :u
        """), {"mid": message_id, "u": user_id})

        db.execute(text("""
            UPDATE message_user_status
               SET is_read = 1, read_at = NOW()
             WHERE message_id = :mid AND user_id = :u
        """), {"mid": message_id, "u": user_id})

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
