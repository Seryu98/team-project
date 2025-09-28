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


# ✅ 프로필 수정용 DTO (자기소개/경력/자격증/생년월일/성별)
class ProfileUpdate(BaseModel):
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
    bio: Optional[str] = None
    experience: Optional[str] = None
    certifications: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    follower_count: int
    following_count: int
    skills: List[SkillOut] = []  # 유저가 가진 스킬 목록
    # projects: List[ProjectOut] = []  # 🚧 추후 Post 모델 완성되면 추가

    class Config:
        orm_mode = True
