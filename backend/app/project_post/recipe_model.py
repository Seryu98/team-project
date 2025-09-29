#app/project_post/recipe_model.py
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.base import Base


class RecipePost(Base):
    __tablename__ = "posts"   # 실제 DB 테이블 이름

    id = Column(Integer, primary_key=True, index=True)
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum("PROJECT", "STUDY", name="post_type"), nullable=False)
    title = Column(String(200), nullable=False)
    field = Column(String(100))
    image_url = Column(String(255))
    capacity = Column(Integer, nullable=False)
    current_members = Column(Integer, default=0)
    description = Column(Text)
    start_date = Column(Date)   
    end_date = Column(Date)
    #status = Column(Enum("PENDING", "APPROVED", "REJECTED", name="post_status"), default="PENDING")
    status = Column(Enum("APPROVED", "REJECTED", name="post_status"), default="APPROVED")   # ✅ 기본값을 APPROVED 로 변경
    created_at = Column(DateTime, default=datetime.utcnow)

    skills = relationship("RecipePostSkill", back_populates="post")
    files = relationship("RecipeFile", back_populates="post")
    required_fields = relationship("RecipePostRequiredField", back_populates="post")
    members = relationship("PostMember", back_populates="post", cascade="all, delete-orphan")


class RecipePostSkill(Base):
    __tablename__ = "post_skills"

    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), primary_key=True)

    post = relationship("RecipePost", back_populates="skills")


class RecipeFile(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_url = Column(String(255), nullable=False)
    file_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("RecipePost", back_populates="files")


class RecipePostRequiredField(Base):
    __tablename__ = "post_required_fields"

    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    field_id = Column(Integer, ForeignKey("application_fields.id"), primary_key=True)  # ✅ DB 테이블명 맞춤

    post = relationship("RecipePost", back_populates="required_fields")
