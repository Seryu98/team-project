# models/application.py
from __future__ import annotations
from datetime import datetime
import enum
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Text, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ApplicationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("posts.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    answers: Mapped[list["ApplicationAnswer"]] = relationship(
        "ApplicationAnswer", back_populates="application", cascade="all, delete-orphan"
    )

    # ✅ 같은 글에 같은 유저는 한 번만 지원 가능
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_user"),)

class ApplicationField(Base):
    __tablename__ = "application_fields"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

class PostRequiredField(Base):
    __tablename__ = "post_required_fields"
    post_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("posts.id"), primary_key=True)
    field_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("application_fields.id"), primary_key=True)

class ApplicationAnswer(Base):
    __tablename__ = "application_answers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("applications.id"), nullable=False)
    field_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("application_fields.id"), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    application: Mapped["Application"] = relationship("Application", back_populates="answers")

    __table_args__ = (UniqueConstraint("application_id", "field_id", name="uq_application_field"),)
