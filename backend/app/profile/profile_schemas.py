from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from enum import Enum

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"

class SkillOut(BaseModel):
    id: int
    name: str
    level: int
    icon: Optional[str] = None

    class Config:
        orm_mode = True


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None  # ✅ 추가
    headline: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[str] = None
    certifications: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None

    class Config:
        orm_mode = True


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
    is_following: bool = False

    class Config:
        orm_mode = True