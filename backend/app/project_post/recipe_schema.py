# app/project_post/recipe_schema.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


# ▶ 요청 DTO
class RecipePostCreate(BaseModel):
    """프로젝트/스터디 게시글 생성 시 클라이언트가 보내는 데이터"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    capacity: int = Field(..., gt=0)
    type: str = Field(..., pattern="^(PROJECT|STUDY)$")
    field: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    project_start: Optional[date] = None
    project_end: Optional[date] = None
    skills: List[int] = []                # skill_id 목록
    application_fields: List[int] = []    # field_id 목록
    image_url: Optional[str] = None       # 대표 이미지 URL


# ▶ 응답 DTO
class RecipePostResponse(BaseModel):
    """게시글 단건 응답 스키마"""
    id: int
    title: str
    description: Optional[str]
    capacity: int
    type: str
    field: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    project_start: Optional[date]
    project_end: Optional[date]
    project_status: Optional[str]
    status: str
    recruit_status: str
    created_at: datetime
    current_members: int
    image_url: Optional[str]
    leader_id: int
    skills: Optional[list]
    application_fields: Optional[list]
    members: Optional[list]

    class Config:
        from_attributes = True  # ✅ ORM 객체를 직접 변환할 수 있도록 설정


# ▶ 멤버 응답 DTO
class PostMemberResponse(BaseModel):
    """게시글 내 참여 멤버 정보"""
    user_id: int
    role: str
    nickname: Optional[str] = None
    profile_image: Optional[str] = None


# ✅ 추가: 페이지네이션 응답 스키마
class PaginatedRecipePost(BaseModel):
    """게시글 목록을 페이지 단위로 내려주는 응답 스키마"""
    items: List[RecipePostResponse]
    total: int
    page: int
    page_size: int
    has_next: bool

    class Config:
        from_attributes = True
