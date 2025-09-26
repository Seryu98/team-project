# app/schemas/notification.py
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.notification import NotificationType

# 알림 생성 요청 DTO
class NotificationCreate(BaseModel):
    user_id: int                   # 수신자 ID
    message: str                   # 알림 메시지
    related_id: Optional[int] = None  # 연관 엔티티 ID (없을 수도 있음)

    # JSON 필드명은 DB와 맞추어 "type" 사용 → Python 코드에서는 notification_type 으로 매핑
    notification_type: NotificationType = Field(alias="type")

    class Config:
        populate_by_name = True    # alias 변환 허용

# 알림 조회 응답 DTO
class NotificationItem(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime
    notification_type: NotificationType = Field(alias="type")

    class Config:
        orm_mode = True            # ORM 객체 → Pydantic 자동 변환 허용
        populate_by_name = True
