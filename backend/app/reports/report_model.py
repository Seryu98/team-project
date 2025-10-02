from sqlalchemy import Column, BigInteger, ForeignKey, Enum, String, DateTime, func, Index
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
    target_type = Column(
        Enum(TargetType, name="report_target_type", native_enum=False), nullable=False
    )
    target_id = Column(BigInteger, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(
        Enum(ReportStatus, name="report_status", native_enum=False),
        nullable=False,
        default=ReportStatus.PENDING
    )
    created_at = Column(DateTime, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

# ✅ 인덱스 (중복 신고 방지 + 조회 성능)
Index("ix_reports_reported_user_id", Report.reported_user_id)
Index("ix_reports_target", Report.target_type, Report.target_id)
Index("ix_reports_reporter_target", Report.reporter_user_id, Report.target_type, Report.target_id)
