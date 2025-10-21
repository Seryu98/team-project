# app/models/user_session.py
from datetime import datetime, timedelta
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.base import Base


class UserSession(Base):
    """
    ✅ 사용자 세션 관리 테이블
    - refresh token을 저장하여 세션별 관리 가능
    - 일반 유저는 다중 세션 허용
    - 관리자(Admin)는 단일 세션만 유지
    """
    __tablename__ = "user_sessions"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ✅ DB 구조 반영: device_id, token, ip, is_active, expires_at
    device_id = Column(String(100), nullable=False, comment="기기/브라우저 식별자 (uuid 또는 UA 해시)")
    token = Column(String(512), nullable=False, unique=False, comment="현재 활성 Access 토큰(JWT)")
    ip = Column(String(100), nullable=True, comment="IP 주소")
    is_active = Column(Boolean, default=True, comment="활성 상태")

    created_at = Column(DateTime, default=datetime.utcnow, comment="세션 생성 시각")
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=1), comment="만료 시각 (1일)")

    # ✅ 관계 설정
    user = relationship("User", back_populates="sessions")

    def expire(self):
        """세션 만료 처리"""
        self.is_active = False
        self.expires_at = datetime.utcnow()
