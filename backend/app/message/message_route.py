from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.auth_service import get_current_user
from app.users.user_model import User
from app.message.message_model import Message  
from app.notify.notification_model import Notification

from . import message_service
from .message_schema import MessageCreate, MessageResponse

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/", response_model=MessageResponse)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    receiver = db.query(User).filter(User.nickname == payload.receiver_nickname).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="존재하지 않는 사용자입니다.")
    
    sender = db.query(User).filter(User.id == current_user.id).first()

    new_msg = Message(
        sender_id=sender.id,
        receiver_id=receiver.id,
        content=payload.content,
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    notif = Notification(
        user_id=receiver.id,
        notification_type="MESSAGE", 
        message=f"{sender.nickname} 님이 쪽지를 보냈습니다.",
        related_id=new_msg.id,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()

    return {
        "id": new_msg.id,
        "sender_nickname": sender.nickname,
        "receiver_nickname": receiver.nickname,
        "content": new_msg.content,
        "is_read": new_msg.is_read,
        "created_at": new_msg.created_at,
        "sender_name": sender.nickname,
    }


@router.get("/inbox", response_model=list[MessageResponse])
def get_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.get_inbox(db, current_user.id)


@router.get("/sent", response_model=list[MessageResponse])
def get_sent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.get_sent(db, current_user.id)


@router.get("/{msg_id}", response_model=MessageResponse)
def get_message_detail(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.get_message_detail(db, msg_id, current_user.id)


@router.patch("/{msg_id}/read", response_model=MessageResponse)
def mark_as_read(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = message_service.mark_as_read(db, msg_id, current_user.id)  # ✅ 수정
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return msg


@router.delete("/{msg_id}")
def delete_message(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return message_service.delete_message(db, msg_id, current_user.id)