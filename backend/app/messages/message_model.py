# app/messages/message_model.py
from __future__ import annotations
from datetime import datetime
import enum
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

# ================================================
# ✅ 쪽지 카테고리
# ================================================
class MessageCategory(str, enum.Enum):
    NORMAL = "NORMAL"     # 일반 유저 간 쪽지
    NOTICE = "NOTICE"     # 공지사항 (운영팀)
    ADMIN = "ADMIN"       # 관리자 제재/신고 관련

# ================================================
# ✅ 쪽지 모델
# ================================================
class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    # ✅ 송신자/수신자
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="발신자 ID"
    )
    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="수신자 ID"
    )

    # ✅ 내용
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="쪽지 내용")

    # ✅ 읽음 여부
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, comment="읽음 여부")

    # ✅ 쪽지 카테고리 컬럼
    category: Mapped[MessageCategory] = mapped_column(
        Enum(MessageCategory),              # SQLAlchemy Enum 매핑
        default=MessageCategory.NORMAL,     # 기본값 NORMAL
        nullable=False,
        comment="쪽지 카테고리 (NORMAL / NOTICE / ADMIN)",
    )

    # ✅ 생성일
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        comment="쪽지 생성 시각"
    )

    # ✅ 관계 설정
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
