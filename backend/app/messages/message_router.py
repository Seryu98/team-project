# app/messages/message_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import get_current_user
from app.messages.message_service import list_inbox, get_message, send_message, mark_read

router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("")
def api_list_inbox(limit: int = Query(50), user=Depends(get_current_user)):
    """받은 메시지함 조회"""
    return {"success": True, "data": list_inbox(user_id=user.id, limit=limit)}

@router.get("/{message_id}")
def api_get_message(message_id: int, user=Depends(get_current_user)):
    """단일 메시지 조회"""
    m = get_message(user_id=user.id, message_id=message_id)
    if not m:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")
    return {"success": True, "data": m}

@router.post("")
def api_send_message(receiver_id: int, content: str, user=Depends(get_current_user)):
    """메시지 전송"""
    mid = send_message(sender_id=user.id, receiver_id=receiver_id, content=content)
    return {"success": True, "data": {"message_id": mid}}

@router.post("/{message_id}/read")
def api_mark_read(message_id: int, user=Depends(get_current_user)):
    """메시지 읽음 처리"""
    ok = mark_read(user_id=user.id, message_id=message_id)
    return {"success": ok}
