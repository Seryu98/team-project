from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime

from .message_model import Message
from .message_schema import MessageCreate
from app.users.user_model import User
from app.notify.notification_model import Notification  # ✅ 알림 모델 import
from app.notify.notification_model import NotificationType


def send_message(db: Session, sender_id: int, receiver_nickname: str, content: str):
    # ✅ 닉네임으로 수신자 조회
    receiver = db.query(User).filter(User.nickname == receiver_nickname.strip()).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="존재하지 않는 사용자입니다.")
    
    sender = db.query(User).filter(User.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="발신자를 찾을 수 없습니다.")

    # 쪽지 생성
    new_msg = Message(
        sender_id=sender.id,
        receiver_id=receiver.id,
        content=content,
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    # ✅ 알림 생성
    notif = Notification(
        user_id=receiver.id,
        notification_type=NotificationType.MESSAGE,
        message=f"{sender.nickname} 님이 쪽지를 보냈습니다.",
        related_id=new_msg.id,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()

    return new_msg


def get_inbox(db: Session, user_id: int):
    q = (
        db.query(Message)
        .filter(Message.receiver_id == user_id, Message.deleted_at == None)
        .all()
    )
    return [_to_message_response(msg, db) for msg in q]


def get_sent(db: Session, user_id: int):
    q = (
        db.query(Message)
        .filter(Message.sender_id == user_id, Message.deleted_at == None)
        .all()
    )
    return [_to_message_response(msg, db) for msg in q]


def get_message_detail(db: Session, msg_id: int, current_user_id: int):
    msg = db.query(Message).filter(
        Message.id == msg_id,
        Message.deleted_at == None
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != current_user_id and msg.receiver_id != current_user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    return _to_message_response(msg, db)


def mark_as_read(db: Session, msg_id: int, current_user_id: int):
    msg = db.query(Message).filter(
        Message.id == msg_id,
        Message.deleted_at == None
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.receiver_id != current_user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    if not msg.is_read:
        msg.is_read = True
        db.commit()
        db.refresh(msg)

    return _to_message_response(msg, db)


def delete_message(db: Session, msg_id: int, current_user_id: int):
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != current_user_id and msg.receiver_id != current_user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    msg.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Deleted (soft delete)"}


# ✅ 응답 변환 함수 (공통)
def _to_message_response(msg: Message, db: Session):
    sender = db.query(User).filter(User.id == msg.sender_id).first()
    receiver = db.query(User).filter(User.id == msg.receiver_id).first()

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "sender_nickname": sender.nickname if sender else "",
        "receiver_nickname": receiver.nickname if receiver else "",
        "sender_name": sender.nickname if sender else "",
        "receiver_name": receiver.nickname if receiver else "",
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": msg.created_at,
    }
