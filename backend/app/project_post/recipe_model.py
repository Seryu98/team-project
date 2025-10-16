# app/project_post/recipe_model.py
from sqlalchemy import Column, BigInteger, String, Text, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.base import Base

class RecipePost(Base):
    __tablename__ = "posts"

    id = Column(BigInteger, primary_key=True, index=True)
    leader_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    type = Column(Enum("PROJECT", "STUDY", name="post_type"), nullable=False)
    title = Column(String(200), nullable=False)
    field = Column(String(100))
    image_url = Column(String(255))
    capacity = Column(BigInteger, nullable=False)
    current_members = Column(BigInteger, default=0)
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    project_status = Column(Enum("ONGOING", "ENDED", name="project_status"), default="ONGOING", nullable=False)
    project_start = Column(Date, nullable=True)
    project_end = Column(Date, nullable=True)
    status = Column(Enum("PENDING", "APPROVED", "REJECTED", name="post_status"), default="PENDING")
    recruit_status = Column(Enum("OPEN", "CLOSED", "FINISHED", name="recruit_status"), default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # ✅ Relationships
    leader = relationship("User", foreign_keys=[leader_id], back_populates="led_posts")
    skills = relationship("RecipePostSkill", back_populates="post", cascade="all, delete-orphan")
    files = relationship("RecipeFile", back_populates="post", cascade="all, delete-orphan")
    application_fields = relationship("RecipePostRequiredField", back_populates="post", cascade="all, delete-orphan")
    members = relationship("PostMember", back_populates="post", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="post", cascade="all, delete-orphan")


class RecipePostSkill(Base):
    __tablename__ = "post_skills"

    post_id = Column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    skill_id = Column(BigInteger, ForeignKey("skills.id"), primary_key=True)

    post = relationship("RecipePost", back_populates="skills")
    skill = relationship("Skill")


class RecipeFile(Base):
    __tablename__ = "files"

    id = Column(BigInteger, primary_key=True, index=True)
    post_id = Column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"))
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    file_url = Column(String(255), nullable=False)
    file_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("RecipePost", back_populates="files")


class RecipePostRequiredField(Base):
    __tablename__ = "post_required_fields"

    post_id = Column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    field_id = Column(BigInteger, ForeignKey("application_fields.id"), primary_key=True)

    post = relationship("RecipePost", back_populates="application_fields")
    field = relationship("ApplicationField")


class Application(Base):
    __tablename__ = "applications"

    id = Column(BigInteger, primary_key=True, index=True)
    post_id = Column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum("PENDING", "APPROVED", "REJECTED", name="application_status"), default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    post = relationship("RecipePost", back_populates="applications")
    answers = relationship("ApplicationAnswer", back_populates="application", cascade="all, delete-orphan")


class ApplicationAnswer(Base):
    __tablename__ = "application_answers"

    id = Column(BigInteger, primary_key=True, index=True)
    application_id = Column(BigInteger, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    field_id = Column(BigInteger, ForeignKey("application_fields.id"), nullable=False)
    answer_text = Column(Text, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="answers")
    field = relationship("ApplicationField")

   