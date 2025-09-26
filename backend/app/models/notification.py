# app/models/notification.py
from enum import Enum as PyEnum
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

# 알림 유형 ENUM 정의 (DB ENUM과 매핑)
class NotificationType(str, PyEnum):
    FOLLOW = "FOLLOW"                      # 팔로우 알림
    APPLICATION = "APPLICATION"            # 지원 알림
    APPLICATION_ACCEPTED = "APPLICATION_ACCEPTED"  # 지원 승인 알림
    APPLICATION_REJECTED = "APPLICATION_REJECTED"  # 지원 거절 알림
    WARNING = "WARNING"                    # 경고 알림
    BAN = "BAN"                            # 정지 알림
    UNBAN = "UNBAN"                        # 정지 해제 알림

# SQLAlchemy 모델: notifications 테이블과 매핑
class Notification(Base):
    __tablename__ = "notifications"  # 테이블명

    # PK (자동 증가 ID)
    id = Column(BigInteger, primary_key=True, autoincrement=True, comment="알림 ID")

    # FK: 알림 수신자
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, comment="알림을 받는 사용자 ID")

    # 알림 유형 → DB 컬럼명은 `type`, Python에선 예약어 충돌 피하기 위해 notification_type 속성명 사용
    notification_type = Column(
        "type",
        Enum(NotificationType, name="notification_type", native_enum=False),
        nullable=False,
        comment="알림 유형"
    )

    # 알림 메시지 (간단한 텍스트)
    message = Column(String(255), nullable=False, comment="알림 메시지")

    # 연관된 엔티티 (예: post_id, application_id)
    related_id = Column(BigInteger, nullable=True, comment="연관된 엔티티 ID")

    # 읽음 여부 (기본값: FALSE)
    is_read = Column(Boolean, nullable=False, default=False, server_default="0", comment="읽음 여부")

    # 생성 시각
    created_at = Column(DateTime, nullable=False, server_default=func.now(), comment="알림 생성 시각")

    # (선택) 수정 시각 컬럼은 DB에 없어서 주석 처리, 필요시 활성화 가능
    # updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now(), comment="수정 시각")

    # User 테이블과의 관계 설정 (User 모델에 back_populates="notifications" 있어야 함)
    user = relationship("User", back_populates="notifications", uselist=False)
