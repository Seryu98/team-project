from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime

from .message_model import Message
from .message_schema import MessageCreate
from app.users.user_model import User
from app.notify.notification_model import Notification  # ✅ 알림 모델 import


def send_message(db: Session, msg: dict):
    # ✅ 수신자 존재 여부 확인
    receiver = db.query(User).filter(User.id == msg["receiver_id"]).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # 쪽지 생성
    new_msg = Message(**msg)
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    # ✅ 쪽지 알림 추가 (수신자에게 알림 전송)
    notif = Notification(
        user_id=new_msg.receiver_id,
        type="MESSAGE",
        message=f"{new_msg.sender_id} 님이 쪽지를 보냈습니다.",
        related_id=new_msg.id,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    db.commit()

    return new_msg


def get_inbox(db: Session, user_id: int):
    q = (
        db.query(Message, User.nickname)
        .join(User, User.id == Message.sender_id)
        .filter(
            Message.receiver_id == user_id,
            Message.deleted_at == None
        )
        .all()
    )

    results = []
    for msg, nickname in q:
        results.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at,
            "sender_name": nickname
        })
    return results


def get_sent(db: Session, user_id: int):
    q = (
        db.query(Message, User.nickname)
        .join(User, User.id == Message.receiver_id)
        .filter(
            Message.sender_id == user_id,
            Message.deleted_at == None
        )
        .all()
    )

    results = []
    for msg, nickname in q:
        results.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at,
            "sender_name": nickname
        })
    return results


def get_message_detail(db: Session, msg_id: int, current_user_id: int):
    msg = db.query(Message).filter(
        Message.id == msg_id,
        Message.deleted_at == None
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != current_user_id and msg.receiver_id != current_user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    return msg


def mark_as_read(db: Session, msg_id: int):
    msg = db.query(Message).filter(
        Message.id == msg_id,
        Message.deleted_at == None
    ).first()
    if msg:
        msg.is_read = True
        db.commit()
    return msg


def delete_message(db: Session, msg_id: int, current_user_id: int):
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id != current_user_id and msg.receiver_id != current_user_id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    msg.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Deleted (soft delete)"}
