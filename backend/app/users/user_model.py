# app/users/user_model.py
from sqlalchemy import Column, BigInteger, String, Enum, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.base import Base
import enum


class UserRole(str, enum.Enum):
    MEMBER = "MEMBER"
    ADMIN = "ADMIN"
    GUEST = "GUEST"
    LEADER = "LEADER"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    BANNED = "BANNED"
    DELETED = "DELETED"


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)

    # ✅ 닉네임은 unique 제거 (DELETED 계정 고려)
    nickname = Column(String(100), nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # ✅ 이메일과 user_id는 반드시 unique
    email = Column(String(255), nullable=False, unique=True)
    user_id = Column(String(255), nullable=True, unique=True)

    password_hash = Column(String(255), nullable=True)
    auth_provider = Column(Enum("LOCAL", "GOOGLE", "KAKAO", "NAVER", name="auth_provider_enum"),
                           nullable=False, default="LOCAL")

    # ✅ social_id는 실제 OAuth 식별자이므로 unique 유지
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
    is_tutorial_completed = Column(Boolean, default=False)

    # ✅ 추가: 중복 로그인 방지용 컬럼
    is_logged_in = Column(Boolean, nullable=False, default=False)

    # ✅ Relationships
    joined_posts = relationship("PostMember", back_populates="user", cascade="all, delete-orphan")
    led_posts = relationship("RecipePost", back_populates="leader")
    board_posts = relationship("BoardPost", back_populates="author", cascade="all, delete-orphan")
    liked_posts = relationship("BoardPostLike", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    profile = relationship("Profile", uselist=False, back_populates="user")


# ✅ 추가 (순환 참조 방지용)
# 이 import는 반드시 클래스 정의 "아래"에 넣어야 합니다.
from app.board import board_model
