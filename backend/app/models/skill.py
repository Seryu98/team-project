from sqlalchemy import Column, BigInteger, String
from app.models.base import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(BigInteger, primary_key=True, index=True, comment="스킬 ID")
    name = Column(String(100), unique=True, nullable=False, comment="스킬명")
