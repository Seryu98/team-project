#app/project_post/recipe_schema.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

# ▶ 요청 DTO
class RecipePostCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    capacity: int = Field(..., gt=0)
    type: str = Field(..., pattern="^(PROJECT|STUDY)$")
    field: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    skills: List[int] = []             # skill_id 목록
    required_fields: List[int] = []    # field_id 목록
    image_url: Optional[str] = None    # ✅ 대표 이미지 (업로드 후 URL 저장)


# ▶ 응답 DTO
class RecipePostResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    capacity: int
    type: str
    field: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    status: str
    created_at: datetime
    image_url: Optional[str] = None    # ✅ 대표 이미지

    class Config:
        from_attributes = True   # ✅ ORM 객체를 Pydantic 모델로 변환