from pydantic import BaseModel, Field
from typing import List, Optional
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
    score: Optional[int] = None  # ✅ 추가
    skills: List[SkillResponse] = Field(default_factory=list) 

    class Config:
        from_attributes = True

# ✅ 별도로 정의해야 함 (UserRankingResponse 밖에)
class UserRankingListResponse(BaseModel):
    users: List[UserRankingResponse]
    total_count: int