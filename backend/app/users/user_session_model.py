# app/users/user_session_model.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timedelta
from app.core.database import Base

class UserSession(Base):
    """
    사용자 로그인 세션 관리 테이블
    - 다중 로그인, 관리자 단일 세션 정책, 알림, 로그아웃 등에 활용
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # JWT 토큰 문자열 저장 (Access/Refresh 구분 없이 저장)
    token = Column(String(512), nullable=False)

    # 부가 정보 (선택)
    device_id = Column(String(100), nullable=True)    # ✅ 로그인한 디바이스 식별자 (User-Agent 기반)
    ip = Column(String(100), nullable=True)           # 접속 IP
    is_active = Column(Boolean, default=True)         # 세션 활성 상태 (로그아웃 시 False로 변경)

    # 생성 및 만료 시각
    created_at = Column(DateTime, default=datetime.utcnow)                        # 생성 시각
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=1))  # 만료 시각 (1일 기본)

    def __repr__(self):
        return f"<UserSession user_id={self.user_id} device={self.device_id} active={self.is_active}>"
