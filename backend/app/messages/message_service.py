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
from datetime import datetime
from app.messages.message_model import MessageCategory
from app.notifications.notification_model import NotificationType, NotificationCategory  # 🩵 [추가] NotificationCategory import
import copy

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
    """
    쪽지 발송
    - sender_id → 발신자
    - receiver_id → 수신자
    - content → 본문
    """
    db, close = _get_db(db)
    try:
        # ✅ 관리자 또는 실제 유저 존재 확인
        sender_exists = db.execute(
            text("SELECT COUNT(*) FROM users WHERE id=:sid"),
            {"sid": sender_id}
        ).scalar()
        if not sender_exists:
            raise HTTPException(status_code=400, detail=f"잘못된 발신자 ID입니다: {sender_id}")

        # ✅ 쪽지 저장 (UTC 시간 기준)
        result = db.execute(text("""
            INSERT INTO messages(sender_id, receiver_id, content, is_read, category, created_at)
            VALUES (:s, :r, :c, 0, :cat, UTC_TIMESTAMP())
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

        # ✅ category별 알림 카테고리 구분
        if category == MessageCategory.ADMIN.value:
            noti_category = NotificationCategory.ADMIN.value
        elif category == MessageCategory.NOTICE.value:
            noti_category = NotificationCategory.NOTICE.value
        else:
            noti_category = NotificationCategory.NORMAL.value

        # ✅ [공지사항 전용 알림 타입/메시지/경로]
        if category == MessageCategory.NOTICE.value:
            noti_type = NotificationType.ADMIN_NOTICE.value if hasattr(NotificationType, "ADMIN_NOTICE") else NotificationType.MESSAGE.value
            noti_message = "📢 새로운 공지사항이 도착했습니다!"
            redirect_path = "/messages?tab=notice"
        else:
            noti_type = NotificationType.MESSAGE.value
            noti_message = "새 메시지가 도착했습니다."
            redirect_path = f"/messages/{message_id}"

        send_notification(
            user_id=receiver_id,
            type_=noti_type,
            message=noti_message,
            related_id=message_id,
            redirect_path=redirect_path,
            category=noti_category,
            db=db,
        )

        db.commit()  # ✅ 공지사항 전송 후 커밋 확실히!
        print(f"📨 메시지 전송 완료: sender={sender_id}, receiver={receiver_id}, cat={category}")
        return int(message_id)
    finally:
        if close:
            db.close()


# ---------------------------------------------------------------------
# ✅ 닉네임 기반 메시지 전송
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
# ✅ 관리자 공지사항 발송 (모든 사용자에게 쪽지 + 알림 전송)
# ---------------------------------------------------------------------
def send_admin_announcement(
    admin_id: int,
    title: str,
    content: str,
    db: Optional[Session] = None,
):
    """
    관리자 공지사항 발송
    - 모든 ACTIVE + BANNED 사용자에게 NOTICE 카테고리 쪽지 생성 및 알림 전송
    """
    db, close = _get_db(db)
    try:
        # 전체 사용자 조회 (BANNED 유저도 공지 수신 대상 포함)
        users = db.execute(text("""
            SELECT id 
              FROM users 
             WHERE status IN ('ACTIVE', 'BANNED')  -- 🩵 변경됨
               AND role != 'ADMIN'
        """)).fetchall()

        if not users:
            raise HTTPException(status_code=400, detail="공지 수신 대상 사용자가 없습니다.")

        # ✅ 단일 트랜잭션으로 처리 (루프마다 commit 안 함)
        for (uid,) in users:
            msg_text = f"📢 [공지사항] {title}\n\n{content}"

            # 내부에서 새 세션 열지 않도록 send_message 호출 로직 직접 인라인화
            db.execute(text("""
                INSERT INTO messages(sender_id, receiver_id, content, is_read, category, created_at)
                VALUES (:s, :r, :c, 0, :cat, UTC_TIMESTAMP())
            """), {"s": admin_id, "r": uid, "c": msg_text, "cat": MessageCategory.NOTICE.value})

            message_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

            # 메시지 상태 추가
            db.execute(text("""
                INSERT INTO message_user_status (message_id, user_id, is_read)
                VALUES (:m, :sender, 1), (:m, :receiver, 0)
            """), {"m": message_id, "sender": admin_id, "receiver": uid})

            # 알림 생성
            send_notification(
                user_id=uid,
                type_=NotificationType.ADMIN_NOTICE.value,
                message="📢 새로운 공지사항이 도착했습니다!",
                related_id=message_id,
                redirect_path="/messages?tab=notice",
                category=NotificationCategory.NOTICE.value,
                db=db,
            )

        db.commit()  # ✅ 루프 완료 후 한 번만 커밋
        print(f"✅ 공지사항 발송 완료 ({len(users)}명 대상)")
        return {"count": len(users), "message": "공지사항 전송 완료"}

    except Exception as e:
        db.rollback()
        print(f"❌ 공지사항 발송 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if close:
            db.close()

# ---------------------------------------------------------------------
# ✅ 수신함 목록
# ---------------------------------------------------------------------
def list_inbox(user_id: int, limit: int = 50, db: Optional[Session] = None, category: str = MessageCategory.NORMAL.value) -> List[Dict]:
    db, close = _get_db(db)
    try:
        db.commit()  # ✅ 세션 캐시 플러시 (신규 커밋 반영 강제)
        db.expire_all()  # ✅ ORM 캐시 무효화
        rows = db.execute(text("""
            SELECT 
                m.id, m.sender_id, sender.nickname AS sender_nickname,
                m.receiver_id, receiver.nickname AS receiver_nickname,
                m.content, m.is_read, m.created_at, m.category
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.receiver_id = :u
            AND m.is_deleted = 0
            AND LOWER(CAST(m.category AS CHAR)) = LOWER(:cat)
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
    """관리자(Admin) 카테고리 쪽지함 전용"""
    return list_inbox(user_id=user_id, limit=limit, db=db, category=MessageCategory.ADMIN.value)

# ---------------------------------------------------------------------
# ✅ 메시지 삭제 (Soft Delete) — 🩵 [추가됨 10/25]
# ---------------------------------------------------------------------
def delete_messages(user_id: int, message_ids: Optional[List[int]] = None, delete_all: bool = False, category: Optional[str] = None, db: Optional[Session] = None) -> bool:
    """
    쪽지 삭제 (Soft Delete)
    - delete_all=True → 전체삭제
    - message_ids → 선택삭제
    - 실제 삭제가 아닌 is_deleted=1 처리
    """
    db, close = _get_db(db)
    try:
        if delete_all:
            if category:
                db.execute(text("""
                    UPDATE messages
                       SET is_deleted = 1
                     WHERE receiver_id = :uid
                       AND LOWER(CAST(category AS CHAR)) = LOWER(:cat)
                """), {"uid": user_id, "cat": category})
            else:
                db.execute(text("""
                    UPDATE messages
                       SET is_deleted = 1
                     WHERE receiver_id = :uid
                """), {"uid": user_id})
            print(f"🧹 전체 쪽지 삭제 완료: user={user_id}")

        elif message_ids:
            id_list = ",".join(map(str, message_ids))
            db.execute(
                text(f"""
                    UPDATE messages
                       SET is_deleted = 1
                     WHERE receiver_id = :uid
                       AND id IN ({id_list})
                """),
                {"uid": user_id},
            )
            print(f"🗑 선택 쪽지 삭제 완료: user={user_id}, ids={message_ids}")
        else:
            raise HTTPException(status_code=400, detail="삭제할 쪽지 정보가 없습니다.")

        db.commit()
        return True
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
                m.id, m.sender_id, sender.nickname AS sender_nickname,
                m.receiver_id, receiver.nickname AS receiver_nickname,
                m.content, m.is_read, m.created_at, m.category
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.sender_id = :u
            AND m.is_deleted = 0
            ORDER BY m.id DESC
            LIMIT :limit
        """), {"u": user_id, "limit": limit}).mappings().all()
        return [dict(r) for r in rows]
    finally:
        if close:
            db.close()


# ---------------------------------------------------------------------
# ✅ 단일 메시지 조회 (상세) — 공지사항(운영자 발송)도 포함
# ---------------------------------------------------------------------
def get_message(user_id: int, message_id: int, db: Optional[Session] = None) -> Optional[Dict]:
    db, close = _get_db(db)
    try:
        # 1️⃣ 일반 메시지(보낸/받은 쪽지) 먼저 시도
        row = db.execute(text("""
            SELECT 
                m.id, m.sender_id, sender.nickname AS sender_nickname,
                m.receiver_id, receiver.nickname AS receiver_nickname,
                m.content, m.is_read, m.created_at, m.category, m.is_deleted
            FROM messages m
            JOIN users sender ON m.sender_id = sender.id
            JOIN users receiver ON m.receiver_id = receiver.id
            WHERE m.id = :mid
              AND (m.sender_id = :u OR m.receiver_id = :u)
        """), {"mid": message_id, "u": user_id}).mappings().first()

        # 🩵 [10/25] 삭제된 쪽지는 조회 불가 처리
        if row and row["is_deleted"]:
            raise HTTPException(status_code=403, detail="삭제된 쪽지입니다.")

        # 2️⃣ 공지사항(운영자 → 모든 유저)일 경우 fallback 조회
        if not row:
            row = db.execute(text("""
                SELECT 
                    m.id, m.sender_id, sender.nickname AS sender_nickname,
                    m.receiver_id, receiver.nickname AS receiver_nickname,
                    m.content, m.is_read, m.created_at, m.category
                FROM messages m
                JOIN users sender ON m.sender_id = sender.id
                JOIN users receiver ON m.receiver_id = receiver.id
                WHERE m.id = :mid
                  AND m.category = 'NOTICE'
            """), {"mid": message_id}).mappings().first()
            if row:
                print(f"📢 [get_message] NOTICE 메시지 fallback 조회됨: message_id={message_id}")

        if not row:
            print(f"⚠️ [get_message] 메시지 없음: message_id={message_id}, user_id={user_id}")
            return None

        # ✅ RowMapping → dict 변환
        data = copy.deepcopy(dict(row))

        # 🩵 기본 상태 지정
        data["application_status"] = "PENDING"
        data["application_id"] = None
        data["post_id"] = None

        # 🩵 지원서 ID / 게시글 ID 추출
        app_id = _extract_application_id(data.get("content"))
        post_id = _extract_post_id(data.get("content"))
        if app_id:
            data["application_id"] = app_id
        if post_id:
            data["post_id"] = post_id

        # 🩵 지원서 상태 동기화 (없으면 기본값 유지)
        if app_id:
            result = db.execute(
                text("SELECT status FROM applications WHERE id=:aid LIMIT 1"),
                {"aid": app_id}
            ).fetchone()
            if result and result[0]:
                data["application_status"] = result[0]
            else:
                data["application_status"] = "PENDING"

        # ✅ 방어로직 (NULL 방지)
        if not data.get("application_status"):
            data["application_status"] = "PENDING"

        print(f"📤 [get_message] 최종 응답 데이터: {data}")
        return data

    finally:
        if close:
            db.close()





# ---------------------------------------------------------------------
# ✅ 메시지 읽음 처리
# ---------------------------------------------------------------------
def mark_read(user_id: int, message_id: int, db: Optional[Session] = None) -> bool:
    """
    메시지 읽음 처리 및 알림 동기화
    """
    db, close = _get_db(db)
    try:
        db.execute(text("""
            UPDATE messages SET is_read = 1
             WHERE id = :mid AND receiver_id = :u
        """), {"mid": message_id, "u": user_id})

        db.execute(text("""
            UPDATE message_user_status
               SET is_read = 1, read_at = UTC_TIMESTAMP()
             WHERE message_id = :mid AND user_id = :u
        """), {"mid": message_id, "u": user_id})

        # 🩵 [수정] 알림 연동 — MESSAGE 타입만 읽음 처리
        db.execute(text("""
            UPDATE notifications
               SET is_read = 1
             WHERE user_id = :u
               AND type = :type
               AND related_id = :mid
        """), {"u": user_id, "mid": message_id, "type": NotificationType.MESSAGE.value})

        db.commit()
        print(f"✅ 메시지 읽음 처리 완료 (message_id={message_id})")
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
