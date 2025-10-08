# app/profile/follow_schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FollowOut(BaseModel):
    follower_id: int
    following_id: int
    created_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        orm_mode = True
