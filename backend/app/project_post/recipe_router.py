from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.deps import get_current_user
from app.project_post.recipe_schema import RecipePostCreate, RecipePostResponse
from app.project_post import recipe_service
from app.users.user_model import User   # ✅ users 도메인에서 가져오기
from app import models

router = APIRouter(prefix="/recipe", tags=["recipe"])


# ▶ 모집공고 생성
@router.post("/", response_model=RecipePostResponse)
async def create_post(
    payload: RecipePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 권한 체크
    if current_user.role not in ["LEADER", "ADMIN", "MEMBER"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # 서비스 호출
    new_post = recipe_service.create_recipe_post(
        db=db,
        leader_id=current_user.id,
        **payload.dict()
    )
    return new_post


# ▶ 게시판 목록 조회 (필터 + 검색 + 페이지네이션)
@router.get("/list", response_model=List[RecipePostResponse])
async def get_posts(
    db: Session = Depends(get_db),
    type: Optional[str] = None,             # 프로젝트/스터디 필터
    status: Optional[str] = "APPROVED",     # 승인된 글만 기본 조회
    skill_ids: Optional[List[int]] = Query(None),  # 기술 스택 필터
    start_date: Optional[date] = None,      # 모집 시작일
    end_date: Optional[date] = None,        # 모집 종료일
    search: Optional[str] = None,           # 검색 (제목/설명)
    page: int = 1,
    page_size: int = 10,
):
    query = db.query(models.RecipePost).filter(models.RecipePost.status == status)

    # 프로젝트/스터디 필터
    if type:
        query = query.filter(models.RecipePost.type == type)

    # 기술 스택 필터
    if skill_ids:
        query = query.join(models.RecipePostSkill).filter(models.RecipePostSkill.skill_id.in_(skill_ids))

    # 모집기간 검색 (겹치는 경우만 조회)
    if start_date and end_date:
        query = query.filter(
            models.RecipePost.start_date <= end_date,
            models.RecipePost.end_date >= start_date
        )

    # 텍스트 검색 (제목 + 설명)
    if search:
        query = query.filter(
            models.RecipePost.title.contains(search) |
            models.RecipePost.description.contains(search)
        )

    # 페이지네이션
    posts = query.offset((page - 1) * page_size).limit(page_size).all()
    return posts