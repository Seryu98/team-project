# app/notifications/notification_router.py
# ✅ 알림 API 라우터
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from app.core.deps import get_current_user
from app.notifications.notification_service import list_notifications, mark_read, unread_count

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
def api_list_notifications(only_unread: bool = Query(False), limit: int = Query(50), user=Depends(get_current_user)):
    # 한 줄 요약 주석: 사용자 알림 목록 조회
    return {
        "success": True,
        "data": list_notifications(user_id=user.id, only_unread=only_unread, limit=limit)
    }

@router.get("/unread_count")
def api_unread_count(user=Depends(get_current_user)):
    return {"success": True, "data": {"count": unread_count(user_id=user.id)}}

@router.post("/mark_read")
def api_mark_read(notification_ids: List[int], user=Depends(get_current_user)):
    updated = mark_read(user_id=user.id, notification_ids=notification_ids)
    return {"success": True, "data": {"updated": updated}}
