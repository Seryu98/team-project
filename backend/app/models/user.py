# app/models/user.py
from sqlalchemy import Column, BigInteger, String, Enum, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from app.models.base import Base
import enum

# role과 status Enum 정의
class UserRole(str, enum.Enum):
    MEMBER = "MEMBER"
    ADMIN = "ADMIN"
    GUEST = "GUEST"
    LEADER = "LEADER"

class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    BANNED = "BANNED"
    DELETED = "DELETED"

# 실제 users 테이블에 매핑될 User 모델
class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    nickname = Column(String(100), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    email = Column(String(255), nullable=False, unique=True)
    user_id = Column(String(255), nullable=True, unique=True)
    password_hash = Column(String(255), nullable=True)
    auth_provider = Column(Enum("LOCAL", "GOOGLE", "KAKAO", "NAVER", name="auth_provider_enum"), nullable=False, default="LOCAL")
    social_id = Column(String(255), nullable=True, unique=True)
    name = Column(String(50), nullable=False)
    phone_number = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.MEMBER)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    last_login_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expire = Column(DateTime, nullable=True)
    login_fail_count = Column(Integer, nullable=False, default=0)
    last_fail_time = Column(DateTime, nullable=True)
    account_locked = Column(Boolean, nullable=False, default=False)
    banned_until = Column(DateTime, nullable=True)