from sqlalchemy import Column, BigInteger, ForeignKey, Integer
from app.core.base import Base

class UserSkill(Base):
    __tablename__ = "user_skills"

    user_id = Column(BigInteger, ForeignKey("users.id"), primary_key=True, comment="유저 ID")
    skill_id = Column(BigInteger, ForeignKey("skills.id"), primary_key=True, comment="스킬 ID")
    level = Column(Integer, nullable=False, comment="숙련도 (1~3)")  # ⭐ 1, 2, 3만 사용