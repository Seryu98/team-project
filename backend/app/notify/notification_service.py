import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.notify.notification_model import Notification
from app.notify.notification_schemas import NotificationCreate

logging.basicConfig(level=logging.INFO)

# 알림 생성
def create_notification(db: Session, data: NotificationCreate) -> Notification:
    logging.info("알림 생성: user_id=%s, type=%s", data.user_id, data.notification_type)
    item = Notification(
        user_id=data.user_id,
        notification_type=data.notification_type,  # DB 컬럼명 type
        message=data.message,
        related_id=data.related_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)  # insert된 데이터 다시 조회해서 최신 상태 반환
    return item

# 특정 사용자 알림 목록 조회 (페이징 지원)
def get_notifications_by_user(
    db: Session,
    user_id: int,
    only_unread: bool = False,
    skip: int = 0,          # 건너뛸 개수 (offset)
    limit: int = 10         # 가져올 개수 (page size)
) -> List[Notification]:
    logging.info("알림 조회: user_id=%s, only_unread=%s, skip=%s, limit=%s",
                 user_id, only_unread, skip, limit)
    q = db.query(Notification).filter(Notification.user_id == user_id)
    if only_unread:
        q = q.filter(Notification.is_read.is_(False))
    return (
        q.order_by(Notification.id.desc())
         .offset(skip)
         .limit(limit)
         .all()
    )

# 알림 읽음 처리 (무조건 읽음 처리만 가능)
def mark_notification_read(db: Session, notification_id: int) -> Optional[Notification]:
    logging.info("알림 읽음 처리: id=%s", notification_id)
    item = db.query(Notification).filter(Notification.id == notification_id).first()
    if not item:
        return None
    item.is_read = True
    db.commit()
    db.refresh(item)
    return item
