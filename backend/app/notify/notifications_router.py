from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session 

from app.core.database import get_db
from app.auth.auth_service import get_current_user   # ✅ 현재 로그인 유저 가져오기
from app.users.user_model import User

from app.notify.notification_schemas import NotificationCreate, NotificationItem
from app.notify.notification_service import (
    create_notification,
    get_notifications_by_user,
    mark_notification_read,
)
from app.utils.response_util import ok, fail

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ------------------------
# 알림 생성 API
# ------------------------
@router.post("/", response_model=None)
def post_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    """
    알림 생성 (FOLLOW, APPLICATION 등)
    """
    item = create_notification(db, payload)
    return ok(
        data=NotificationItem.model_validate(item).model_dump(by_alias=True),
        message="생성 성공"
    )

# ------------------------
# 사용자 알림 목록 조회 API (페이징 지원)
# ------------------------
@router.get("/", response_model=None)
def get_user_notifications(
    unread: Optional[bool] = False,   # /notifications?unread=true
    skip: int = 0,                    # /notifications?skip=0
    limit: int = 10,                  # /notifications?limit=20
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total, items = get_notifications_by_user(
        db,
        user_id=current_user.id,
        only_unread=bool(unread),
        skip=skip,
        limit=limit
    )

    data = [NotificationItem.model_validate(i).model_dump(by_alias=True) for i in items]
    return ok(
        data={"total": total, "items": data},
        message="조회 성공"
    )

# ------------------------
# 알림 읽음 처리 API
# ------------------------
@router.patch("/{notification_id}/read", response_model=None)
def patch_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    알림 읽음 처리 API
    """
    item = mark_notification_read(db, notification_id)

    if not item or item.user_id != current_user.id:
        return JSONResponse(status_code=404, content=fail("알림을 찾을 수 없습니다."))

    return ok(
        data=NotificationItem.model_validate(item).model_dump(by_alias=True),
        message="읽음 처리 성공"
    )
