# app/models/required_field.py
from sqlalchemy import Column, Integer, String
from app.models.base import Base

class ApplicationField(Base):   # ✅ 이름도 ApplicationField로 맞춤
    __tablename__ = "application_fields"   # ✅ 실제 DB 테이블 이름과 동일하게

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)