# models/skill.py
from sqlalchemy import Column, Integer, String
from app.core.base import Base

# DB에 있는 seed 참고용
class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
