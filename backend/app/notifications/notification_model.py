# app/notifications/notification_model.py
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, Enum, String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


# =======================================
# 📌 알림 타입 ENUM 정의
# =======================================
class NotificationType(str, enum.Enum):
    FOLLOW = "FOLLOW"
    APPLICATION = "APPLICATION"
    APPLICATION_ACCEPTED = "APPLICATION_ACCEPTED"
    APPLICATION_REJECTED = "APPLICATION_REJECTED"
    WARNING = "WARNING"
    BAN = "BAN"
    UNBAN = "UNBAN"
    MESSAGE = "MESSAGE"
    REPORT_RECEIVED = "REPORT_RECEIVED"
    REPORT_RESOLVED = "REPORT_RESOLVED"
    REPORT_REJECTED = "REPORT_REJECTED"


# =======================================
# 📦 알림 테이블 모델
# =======================================
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    related_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # ✅ 새로 추가된 필드
    redirect_path: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="알림 클릭 시 이동 경로")

    # ✅ 관계 설정 (선택)
    user = relationship("User", backref="notifications")
