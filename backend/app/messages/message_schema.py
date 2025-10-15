# app/messages/message_schema.py
from pydantic import BaseModel, Field
from typing import Optional

# ✅ 쪽지 생성 요청 스키마
class MessageCreate(BaseModel):
    receiver_id: Optional[int] = Field(None, description="수신자 ID (선택)")
    receiver_nickname: Optional[str] = Field(None, description="수신자 닉네임 (선택)")
    content: str = Field(..., description="쪽지 내용")

    class Config:
        orm_mode = True
