from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


# ✅ 스킬 응답 DTO
class SkillResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True


# ✅ 필수 입력값 응답 DTO
class ApplicationFieldResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True


# ✅ 게시글 생성 요청 DTO
class RecipePostCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    capacity: int = Field(..., gt=0)
    type: str = Field(..., pattern="^(PROJECT|STUDY)$")
    field: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    skills: List[int] = []                   # skill_id 배열
    application_fields: List[int] = []       # field_id 배열
    image_url: Optional[str] = None


# ✅ 게시글 응답 DTO
class RecipePostResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    capacity: int
    current_members: int
    type: str
    field: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    status: str
    created_at: datetime
    image_url: Optional[str] = None
    skills: List[SkillResponse] = []
    application_fields: List[ApplicationFieldResponse] = []   # ✅ 필수 입력값 DTO 포함
    leader_id: int

    class Config:
        from_attributes = True
