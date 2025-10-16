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
# ✅ 알림 카테고리 ENUM (추가됨)
# =======================================
class NotificationCategory(str, enum.Enum):
    """알림 구분용 카테고리"""
    USER = "USER"        # 일반 사용자용 알림 (팔로우, 쪽지 등)
    ADMIN = "ADMIN"      # 관리자 관련 알림 (신고, 제재 등)
    SYSTEM = "SYSTEM"    # 시스템 자동 알림 (업데이트, 점검 등)

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

    # ✅ 기존: 클릭 시 이동 경로
    redirect_path: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="알림 클릭 시 이동 경로")

    # ✅ [추가됨] 알림 카테고리 (ADMIN/USER/SYSTEM)
    category: Mapped[NotificationCategory | None] = mapped_column(
        Enum(NotificationCategory),
        nullable=True,
        default=NotificationCategory.USER,
        comment="알림 카테고리 (관리자/일반/시스템)",
    )

    # ✅ 관계 설정
    user = relationship("User", backref="notifications")