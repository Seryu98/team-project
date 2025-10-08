# backend/app/board/board_model.py
from sqlalchemy import (
    Column, BigInteger, String, Text, Enum, ForeignKey, DateTime, Integer, Boolean
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.base import Base
import enum


# ===============================
# ENUM 정의
# ===============================
class BoardStatus(str, enum.Enum):
    VISIBLE = "VISIBLE"
    HIDDEN = "HIDDEN"
    DELETED = "DELETED"


class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class ReportTarget(str, enum.Enum):
    BOARD_POST = "BOARD_POST"
    COMMENT = "COMMENT"


# ===============================
# 게시판 테이블
# ===============================
class Board(Base):
    __tablename__ = "boards"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

    # 관계
    posts = relationship("BoardPost", back_populates="board", cascade="all, delete")


# ===============================
# 카테고리
# ===============================
class Category(Base):
    __tablename__ = "categories"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)

    posts = relationship("BoardPost", back_populates="category")


# ===============================
# 게시글
# ===============================
class BoardPost(Base):
    __tablename__ = "board_posts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_id = Column(BigInteger, ForeignKey("categories.id"), nullable=True)
    author_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)

    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    attachment_url = Column(String(255), nullable=True)

    view_count = Column(Integer, nullable=False, default=0)
    like_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    status = Column(Enum(BoardStatus), nullable=False, default=BoardStatus.VISIBLE)
    deleted_at = Column(DateTime, nullable=True)

    # 관계
    board = relationship("Board", back_populates="posts")
    category = relationship("Category", back_populates="posts")
    author = relationship("User", back_populates="board_posts")

    comments = relationship("Comment", back_populates="board_post", cascade="all, delete-orphan")
    likes = relationship("BoardPostLike", back_populates="post", cascade="all, delete-orphan")
    views = relationship("BoardPostView", back_populates="post", cascade="all, delete-orphan")


# ===============================
# 게시글 좋아요
# ===============================
class BoardPostLike(Base):
    __tablename__ = "board_post_likes"

    board_post_id = Column(BigInteger, ForeignKey("board_posts.id"), primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    post = relationship("BoardPost", back_populates="likes")
    user = relationship("User", back_populates="liked_posts")


# ===============================
# 게시글 조회 기록
# ===============================
class BoardPostView(Base):
    __tablename__ = "board_post_views"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    board_post_id = Column(BigInteger, ForeignKey("board_posts.id"), nullable=False)
    viewer_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    viewed_at = Column(DateTime, nullable=False, server_default=func.now())

    post = relationship("BoardPost", back_populates="views")


# ===============================
# 댓글 / 대댓글
# ===============================
class Comment(Base):
    __tablename__ = "comments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    board_post_id = Column(BigInteger, ForeignKey("board_posts.id"), nullable=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    parent_id = Column(BigInteger, ForeignKey("comments.id"), nullable=True)

    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    status = Column(Enum(BoardStatus), nullable=False, default=BoardStatus.VISIBLE)
    deleted_at = Column(DateTime, nullable=True)

    board_post = relationship("BoardPost", back_populates="comments")
    author = relationship("User", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], back_populates="replies")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")


# ===============================
# 신고
# ===============================
class Report(Base):
    __tablename__ = "reports"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    reported_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    reporter_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)

    target_type = Column(Enum(ReportTarget), nullable=False)
    target_id = Column(BigInteger, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.PENDING)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    deleted_at = Column(DateTime, nullable=True)
