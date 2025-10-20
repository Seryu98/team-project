# app/notifications/notification_router.py
# ✅ 알림 API 라우터

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.deps import get_current_user, get_db
from app.notifications.notification_model import Notification
from app.notifications.notification_service import list_notifications, mark_read as service_mark_read, unread_count
from app.users.user_model import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ✅ 1. 알림 목록 조회
@router.get("/")
def api_list_notifications(
    only_unread: bool = Query(False),
    limit: int = Query(50),
    user: User = Depends(get_current_user)
):
    """
    사용자 알림 목록 조회
    """
    return {
        "success": True,
        "data": list_notifications(user_id=user.id, only_unread=only_unread, limit=limit)
    }


# ✅ 2. 읽지 않은 알림 개수
@router.get("/unread_count")
def api_unread_count(user: User = Depends(get_current_user)):
    """
    읽지 않은 알림 개수 조회
    """
    return {"success": True, "data": {"count": unread_count(user_id=user.id)}}


# ✅ 3. 알림 읽음 처리
@router.post("/mark_read")
def api_mark_read(
    notification_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    알림 읽음 처리
    """
    if not notification_ids:
        raise HTTPException(status_code=400, detail="알림 ID 목록이 비어있습니다.")

    updated = (
        db.query(Notification)
        .filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == current_user.id
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()

    if updated == 0:
        raise HTTPException(status_code=404, detail="대상 알림을 찾을 수 없습니다.")

    return {"success": True, "message": f"{updated}개의 알림 읽음 처리 완료"}
