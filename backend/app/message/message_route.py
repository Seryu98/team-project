from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.auth_service import get_current_user
from app.users.user_model import User

from . import message_service
from .message_schema import MessageCreate, MessageResponse

router = APIRouter(prefix="/messages", tags=["messages"])


# ✅ 쪽지 보내기
@router.post("/", response_model=MessageResponse)
def send_message(msg: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # sender_id를 토큰 기반으로 강제 지정
    msg_data = msg.dict()
    msg_data["sender_id"] = current_user.id
    return message_service.send_message(db, MessageCreate(**msg_data))


# ✅ 받은함
@router.get("/inbox", response_model=list[MessageResponse])
def get_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.get_inbox(db, current_user.id)


# ✅ 보낸함
@router.get("/sent", response_model=list[MessageResponse])
def get_sent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.get_sent(db, current_user.id)


# ✅ 쪽지 상세
@router.get("/{msg_id}", response_model=MessageResponse)
def get_message_detail(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.get_message_detail(db, msg_id, current_user.id)


# ✅ 읽음 처리
@router.patch("/{msg_id}/read", response_model=MessageResponse)
def mark_as_read(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = message_service.mark_as_read(db, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return msg


# ✅ 삭제 (논리삭제)
@router.delete("/{msg_id}")
def delete_message(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.delete_message(db, msg_id, current_user.id)
