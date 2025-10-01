# message_schema.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# 생성용은 sender_nickname 불필요 (토큰에서 sender를 판단)
class MessageCreate(BaseModel):
    receiver_nickname: str
    content: str

# 응답용은 그대로 두되, 베이스를 쪼개는 게 안전
class MessageResponse(BaseModel):
    id: int
    sender_nickname: str
    receiver_nickname: str
    content: str
    is_read: bool
    created_at: datetime
    sender_name: str

    class Config:
        orm_mode = True
