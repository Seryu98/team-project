# app/admin/admin_user_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict
from datetime import datetime
from app.core.database import get_db

def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close

# 🚫 제재된 유저 목록 조회
def list_banned_users(db: Optional[Session] = None) -> List[Dict]:
    db, close = _get_db(db)
    try:
        rows = db.execute(text("""
            SELECT 
                id, nickname, role, status, suspend_until, created_at
            FROM users
            WHERE status = 'BANNED'
            ORDER BY suspend_until DESC
        """)).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()

# 🔓 유저 정지 해제
def unban_user(user_id: int, admin_id: int, db: Optional[Session] = None) -> bool:
    db, close = _get_db(db)
    try:
        updated = db.execute(text("""
            UPDATE users
               SET status = 'ACTIVE', suspend_until = NULL
             WHERE id = :uid AND status = 'BANNED'
        """), {"uid": user_id}).rowcount
        if not updated:
            return False

        # 로그 기록
        db.execute(text("""
            INSERT INTO admin_actions (admin_id, action, target_user_id, reason)
            VALUES (:aid, 'UNBAN', :uid, '관리자에 의해 정지 해제됨')
        """), {"aid": admin_id, "uid": user_id})

        db.commit()
        return True
    finally:
        if close:
            db.close()
