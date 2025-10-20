# app/notifications/notification_service.py
# ✅ 알림 생성/조회/읽음 처리 서비스 (SQLAlchemy 세션 직접 사용)
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.notifications.notification_model import NotificationCategory, NotificationType  # 🩵 [수정] NotificationType import 추가
from app.messages.message_model import MessageCategory
from datetime import datetime  # 🩵 [추가] UTC 시간 기록을 위해 datetime import


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
    - 기본값 NORMAL
    - 관리자 알림 등은 category='ADMIN' 으로 구분
    - redirect_path가 None일 경우 클릭 시 이동 없음
    """
    db, close = _get_db(db)
    try:
        # 🩵 [수정] category 처리: Enum 객체/문자열 모두 대응
        if isinstance(category, NotificationCategory):
            category_value = category.value
        elif isinstance(category, MessageCategory):
            category_value = "ADMIN" if category.value == "ADMIN" else "NORMAL"
        else:
            category_value = category or NotificationCategory.NORMAL.value

        # 🩵 [수정] redirect_path 기본값 보정 (명시적으로 None 문자열 방지)
        redirect_value = redirect_path if redirect_path not in [None, "None"] else None

        # 🩵 [수정] UTC 기반으로 created_at 처리 (NOW() → UTC_TIMESTAMP)
        result = db.execute(
            text("""
                INSERT INTO notifications (
                    user_id, type, message, related_id, redirect_path, is_read, created_at, category
                )
                VALUES (
                    :user_id, :type, :message, :related_id, :redirect_path, 0, UTC_TIMESTAMP(), :category
                )
            """),
            {
                "user_id": user_id,
                "type": type_,
                "message": message,
                "related_id": related_id,
                "redirect_path": redirect_value,
                "category": category_value,
            }
        )
        db.commit()

        inserted_id = (
            result.lastrowid
            if hasattr(result, "lastrowid")
            else db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        )

        # 🩵 [추가] 로그 출력용 (디버그 단계)
        print(f"✅ 알림 전송 완료: user={user_id}, type={type_}, category={category_value}, redirect={redirect_value}")
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

        # 🩵 [수정] category가 있을 때만 필터 추가
        if category:
            sql += " AND category=:category"

        sql += " ORDER BY id DESC LIMIT :limit"

        params = {"user_id": user_id, "limit": limit}
        if category:
            params["category"] = category

        rows = db.execute(text(sql), params).mappings().all()

        # 🩵 [추가] redirect_path가 'None' 문자열이면 실제 None으로 교정
        results = []
        for r in rows:
            rec = dict(r)
            if rec.get("redirect_path") == "None":
                rec["redirect_path"] = None
            results.append(rec)
        return results

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
        # 🩵 [추가] 디버그 로그
        print(f"✅ 읽음 처리 완료: {result.rowcount}개 알림 갱신됨")
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


# ----------------------------
# ✅ [추가] 관리자 신고 알림 분기 (쪽지와 분리)
# ----------------------------
def notify_admin_on_report_created(report_id: int, reporter_id: int, db: Optional[Session] = None):
    """
    신고 발생 시 관리자에게 REPORT_RECEIVED 알림 전송
    - redirect_path → 관리자 대시보드 신고 관리 페이지
    """
    db, close = _get_db(db)
    try:
        admin_id = db.execute(
            text("SELECT id FROM users WHERE role='ADMIN' LIMIT 1")
        ).scalar()
        if not admin_id:
            return False

        send_notification(
            user_id=admin_id,
            type_=NotificationType.REPORT_RECEIVED.value,
            message=f"새로운 신고가 접수되었습니다. (신고 ID: {report_id})",
            related_id=report_id,
            redirect_path="/admin/reports",  # ✅ 수정: 대시보드 이동
            category=NotificationCategory.ADMIN.value,
            db=db,
        )
        db.commit()
        print(f"📨 관리자 신고 알림 전송 완료 (report_id={report_id})")
        return True
    finally:
        if close:
            db.close()


# ----------------------------
# ✅ [추가] 신고 처리 결과 알림
# ----------------------------
def notify_report_result(
    reporter_id: int,
    report_id: int,
    resolved: bool,
    db: Optional[Session] = None,
):
    """
    신고 처리 결과를 신고자에게 알림으로 전달
    - resolved=True → 승인됨
    - resolved=False → 반려됨
    """
    db, close = _get_db(db)
    try:
        type_ = (
            NotificationType.REPORT_RESOLVED.value
            if resolved
            else NotificationType.REPORT_REJECTED.value
        )
        msg = (
            f"신고(ID:{report_id})가 승인되어 처리되었습니다."
            if resolved
            else f"신고(ID:{report_id})가 반려되었습니다."
        )
        send_notification(
            user_id=reporter_id,
            type_=type_,
            message=msg,
            related_id=report_id,
            redirect_path="/messages?tab=admin",
            category=NotificationCategory.ADMIN.value,
            db=db,
        )
        db.commit()
        print(f"📢 신고 처리 알림 전송 완료 (report_id={report_id}, resolved={resolved})")
    finally:
        if close:
            db.close()


# ============================================================
# ✅ [마지막 추가] 실시간 알림(WebSocket) 전송 기능
# ============================================================
# 🧩 주의: 기존 기능은 전혀 수정하지 않고, 아래 보조 유틸만 추가함.
from fastapi import WebSocket
import json

# 현재 접속 중인 사용자별 WebSocket 연결 저장소
active_connections = {}  # {user_id: WebSocket}

async def send_realtime_notification(user_id: int, data: dict):
    """
    실시간 알림 전송 (프론트 WebSocket 연결 대상)
    - data: {"title": "...", "content": "...", "type": "..."}
    """
    ws: Optional[WebSocket] = active_connections.get(user_id)
    if not ws:
        print(f"⚠️ WebSocket 연결 없음 → user_id={user_id}, data={data}")
        return

    try:
        await ws.send_text(json.dumps(data))
        print(f"🔔 실시간 알림 전송 완료 → user_id={user_id}, title={data.get('title')}")
    except Exception as e:
        print(f"⚠️ 실시간 알림 전송 실패 → {e}")
