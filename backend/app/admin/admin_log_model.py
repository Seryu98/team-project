# app/admin/admin_log_model.py
from __future__ import annotations
from datetime import datetime
import enum
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base

class AdminActionType(str, enum.Enum):
    WARNING = "WARNING"
    BAN = "BAN"
    UNBAN = "UNBAN"
    DELETE_POST = "DELETE_POST"
    DELETE_COMMENT = "DELETE_COMMENT"
    DELETE_MESSAGE = "DELETE_MESSAGE"
    REPORT_PROCESS = "REPORT_PROCESS"
    POST_APPROVE = "POST_APPROVE"
    POST_REJECT = "POST_REJECT"

class AdminLog(Base):
    __tablename__ = "admin_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    admin_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    action_type: Mapped[AdminActionType] = mapped_column(Enum(AdminActionType), nullable=False, index=True)
    target_user_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    target_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # USER/POST/COMMENT/MESSAGE
    target_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
