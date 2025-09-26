from sqlalchemy import Column, BigInteger, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import enum


# 역할 Enum (DB ENUM('MEMBER', 'LEADER')와 매칭)
class PostMemberRole(str, enum.Enum):
    MEMBER = "MEMBER"
    LEADER = "LEADER"


class PostMember(Base):
    __tablename__ = "post_members"

    # 복합 PK (post_id + user_id)
    post_id = Column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    role = Column(Enum(PostMemberRole), nullable=False, default=PostMemberRole.MEMBER)
    joined_at = Column(DateTime, nullable=False, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)

    # 관계 설정
    post = relationship("RecipePost", back_populates="members")
    user = relationship("User", back_populates="joined_posts")