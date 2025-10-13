# app/users/user_schema.py
from pydantic import BaseModel
from typing import List,Optional
from app.meta.meta_schema import SkillResponse
from datetime import datetime

class UserRankingResponse(BaseModel):
    id: int
    nickname: str
    profile_image: Optional[str]
    headline: Optional[str]
    follower_count: int
    following_count: int
    created_at: datetime
    skills: List[SkillResponse] = []
    
    class Config:
        from_attributes = True