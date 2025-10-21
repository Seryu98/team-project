from sqlalchemy import Column, BigInteger, String, Text, Integer, DateTime, Enum, Date, ForeignKey, Boolean, JSON
from app.core.base import Base
from sqlalchemy.orm import relationship

class Profile(Base):
    __tablename__ = "profiles"

    # ✅ FK 연결 추가
    id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="users.id 참조"
    )

    profile_image = Column(String(255), nullable=True, comment="프로필 이미지 URL")
    headline = Column(String(200), nullable=True, comment="한 줄 소개")
    bio = Column(Text, nullable=True, comment="자기소개")
    experience = Column(Text, nullable=True, comment="경력")
    certifications = Column(Text, nullable=True, comment="자격증")
    
    # ✅ visibility JSON 컬럼
    visibility = Column(JSON, nullable=True, comment="필드별 공개 여부 설정")

    birth_date = Column(Date, nullable=True, comment="생년월일")
    gender = Column(Enum("MALE", "FEMALE", name="gender_enum"), nullable=True, comment="성별")

    following_count = Column(Integer, nullable=False, default=0, comment="팔로잉 수")
    follower_count = Column(Integer, nullable=False, default=0, comment="팔로워 수")
    deleted_at = Column(DateTime, nullable=True, comment="삭제 시각")

    # ✅ User와 1:1 관계
    user = relationship("User", back_populates="profile", uselist=False)
