# app/admin/user_sanction_model.py
from __future__ import annotations
from datetime import datetime, timedelta
import enum
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base

class SanctionType(str, enum.Enum):
    WARNING = "WARNING"
    TEMP_BAN = "TEMP_BAN"
    PERMA_BAN = "PERMA_BAN"

class UserSanction(Base):
    __tablename__ = "user_sanctions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    sanction_type: Mapped[SanctionType] = mapped_column(Enum(SanctionType), nullable=False, index=True)
    days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # TEMP_BAN일 때만
    ban_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_by_admin_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
