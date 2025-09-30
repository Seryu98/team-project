# app/schemas/notification.py
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.notify.notification_model import NotificationType

# 입력 DTO: JSON에서는 "type"으로 받되, 내부는 notification_type 사용
class NotificationCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    user_id: int
    message: str
    related_id: Optional[int] = None
    # 입력 시 "type" -> notification_type 로 매핑
    notification_type: NotificationType = Field(validation_alias="type")

# 출력 DTO: JSON에서는 "type"으로 내보내고, ORM에선 notification_type에서 읽기
class NotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime
    # ORM의 notification_type을 읽어서, 응답에선 "type"으로 직렬화
    type: NotificationType = Field(validation_alias="notification_type",
                                   serialization_alias="type")
