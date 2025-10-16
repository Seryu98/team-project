# app/report/report_model.py
from __future__ import annotations
from datetime import datetime
import enum
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base  # ✅ 너의 프로젝트는 Base가 app.core.base에 있음

class ReportTargetType(str, enum.Enum):
    USER = "USER"
    POST = "POST"
    COMMENT = "COMMENT"
    MESSAGE = "MESSAGE"

class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"

class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    reporter_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    target_type: Mapped[ReportTargetType] = mapped_column(Enum(ReportTargetType), nullable=False, index=True)
    target_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
