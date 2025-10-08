# app/profile/follow_model.py
from sqlalchemy import Column, BigInteger, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.core.base import Base

class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True, comment="팔로우 하는 사용자")
    following_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True, comment="팔로우 당하는 사용자")
    created_at = Column(DateTime, nullable=False, server_default=func.now(), comment="팔로우 시작일")
    deleted_at = Column(DateTime, nullable=True, comment="삭제 시각")
