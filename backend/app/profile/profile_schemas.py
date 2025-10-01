from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class SkillOut(BaseModel):
    id: int
    name: str
    level: int   # 숙련도 (1~3)
    icon: Optional[str] = None  # 프론트 assets 경로

    class Config:
        orm_mode = True


# ✅ 프로필 수정용 DTO (닉네임/한 줄 소개 추가)
class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None       # users.nickname
    headline: Optional[str] = None       # profiles.headline
    bio: Optional[str] = None
    experience: Optional[str] = None
    certifications: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None  # "MALE" / "FEMALE"

    class Config:
        orm_mode = True


# ✅ 프로필 조회 응답 DTO
class ProfileOut(BaseModel):
    id: int
    nickname: str
    email: str
    profile_image: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[str] = None
    certifications: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    follower_count: int
    following_count: int
    skills: List[SkillOut] = []

    class Config:
        orm_mode = True
