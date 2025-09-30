from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.notification import (
    NotificationCreate,
    NotificationItem,
)
from app.services.notification_service import (
    create_notification,
    get_notifications_by_user,
    mark_notification_read,
)
from app.utils.response import ok, fail

router = APIRouter(prefix="/notifications", tags=["notifications"])

# 알림 생성 API
@router.post("/", response_model=None)
def post_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    """
    알림 생성 (FOLLOW, APPLICATION 등)
    Request JSON 예:
    {
      "user_id": 1,
      "type": "FOLLOW",
      "message": "홍길동님이 팔로우했습니다",
      "related_id": 123
    }
    """

    item = create_notification(db, payload)
    return ok(
        data=NotificationItem.model_validate(item).model_dump(by_alias=True),
        message="생성 성공"
)


# 사용자 알림 목록 조회 API (페이징 지원)
@router.get("/{user_id}", response_model=None)
def get_user_notifications(
    user_id: int,
    unread: Optional[bool] = False,  # /notifications/1?unread=true
    skip: int = 0,                   # /notifications/1?skip=0
    limit: int = 10,                 # /notifications/1?limit=20
    db: Session = Depends(get_db)
):
    items = get_notifications_by_user(db, user_id, only_unread=bool(unread), skip=skip, limit=limit)
    data = [NotificationItem.model_validate(i).model_dump(by_alias=True) for i in items]
    return ok(data=data, message="조회 성공")

# 알림 읽음 처리 API
@router.patch("/{notification_id}/read", response_model=None)
def patch_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """
    알림 읽음 처리 API
    Body 없이 호출 가능 → 호출하면 무조건 is_read = true
    """
    item = mark_notification_read(db, notification_id)
    if not item:
        return JSONResponse(status_code=404, content=fail("알림을 찾을 수 없습니다."))
    return ok(
        data=NotificationItem.model_validate(item).model_dump(by_alias=True),
        message="읽음 처리 성공"
    )
