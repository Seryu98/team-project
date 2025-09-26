from pydantic import BaseModel
from typing import List, Optional

class SkillOut(BaseModel):
    id: int
    name: str
    level: int   # 숙련도 (1~3)
    icon: Optional[str] = None  # 프론트 assets 경로

    class Config:
        orm_mode = True

# class ProjectOut(BaseModel):
#     id: int
#     title: str
#     type: str  # PROJECT / STUDY
#
#     class Config:
#         orm_mode = True

class ProfileOut(BaseModel):
    id: int
    nickname: str
    email: str
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[str] = None
    certifications: Optional[str] = None
    follower_count: int
    following_count: int
    skills: List[SkillOut] = []  # 유저가 가진 스킬 목록
    # projects: List[ProjectOut] = []  # 🚧 추후 Post 모델 완성되면 추가

    class Config:
        orm_mode = True
