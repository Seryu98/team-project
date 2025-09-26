
# models/skill.py
from sqlalchemy import Column, Integer, String
from app.models.base import Base

# DB에 있는 seed 참고용
class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


# app/models/required_field.py
from sqlalchemy import Column, Integer, String
from app.models.base import Base

class RequiredField(Base):
    __tablename__ = "required_fields"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)