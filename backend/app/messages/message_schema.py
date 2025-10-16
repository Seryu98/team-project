# app/messages/message_schema.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from app.messages.message_model import MessageCategory

# ======================================================
# ✅ 쪽지 생성 요청 스키마
# ======================================================
class MessageCreate(BaseModel):
    receiver_id: Optional[int] = Field(None, description="수신자 ID (선택)")
    receiver_nickname: Optional[str] = Field(None, description="수신자 닉네임 (선택)")
    content: str = Field(..., description="쪽지 내용")
    category: Optional[str] = Field(
        default=MessageCategory.NORMAL.value,
        description="쪽지 카테고리 (NORMAL | ADMIN | NOTICE)",
    )

    # ✅ content 유효성 검사
    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str):
        if not v or not v.strip():
            raise ValueError("쪽지 내용을 입력해주세요.")
        if len(v.strip()) > 2000:
            raise ValueError("쪽지 내용은 2000자를 초과할 수 없습니다.")
        return v.strip()

    # ✅ category 유효성 검사
    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]):
        if not v:
            return MessageCategory.NORMAL.value
        v = v.upper()
        if v not in [c.value for c in MessageCategory]:
            raise ValueError("유효하지 않은 쪽지 카테고리입니다. (NORMAL | ADMIN | NOTICE)")
        return v

    class Config:
        orm_mode = True
