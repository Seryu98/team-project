# app/reports/report_model.py
from sqlalchemy import Column, BigInteger, ForeignKey, Enum, String, DateTime, func
from app.core.database import Base
import enum

class TargetType(str, enum.Enum):
    POST = "POST"
    BOARD_POST = "BOARD_POST"
    COMMENT = "COMMENT"
    USER = "USER"

class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"

class Report(Base):
    __tablename__ = "reports"

    id = Column(BigInteger, primary_key=True, index=True)
    reported_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    reporter_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    target_type = Column(Enum(TargetType), nullable=False)
    target_id = Column(BigInteger, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.PENDING)
    created_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)
