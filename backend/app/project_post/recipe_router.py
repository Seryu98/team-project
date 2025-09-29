from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.core.deps import get_current_user
from app.project_post.recipe_schema import RecipePostCreate, RecipePostResponse
from app.project_post import recipe_service, recipe_model as models
from app.users.user_model import User
from app.meta.meta_schema import SkillResponse  # ✅ skill DTO (id, name)

router = APIRouter(prefix="/recipe", tags=["recipe"])


# ✅ 공통 DTO 변환 함수
def to_dto(post: models.RecipePost) -> RecipePostResponse:
    return RecipePostResponse(
        id=post.id,
        title=post.title,
        description=post.description,
        capacity=post.capacity,
        type=post.type,
        field=post.field,
        start_date=post.start_date,
        end_date=post.end_date,
        status=post.status,
        created_at=post.created_at,
        current_members=len(post.members),
        image_url=post.image_url,
        leader_id=post.leader_id,
        skills=[
            SkillResponse(id=s.skill.id, name=s.skill.name)
            for s in post.skills
        ],
    )


# ✅ 모집공고 생성
@router.post("/", response_model=RecipePostResponse)
async def create_post(
    payload: RecipePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ▶ 권한 체크
    if current_user.role not in ["LEADER", "ADMIN", "MEMBER"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # ▶ 서비스 호출 (새 게시글 생성)
    new_post = recipe_service.create_recipe_post(
        db=db,
        leader_id=current_user.id,
        **payload.dict()
    )
    db.refresh(new_post)  # 🔹 관계 데이터 새로고침

    return to_dto(new_post)


# ✅ 게시판 목록 조회
@router.get("/list", response_model=List[RecipePostResponse])
async def get_posts(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None, description="PROJECT 또는 STUDY"),
    status: Optional[str] = Query("APPROVED", description="승인 상태"),
    skill_ids: Optional[List[int]] = Query(None, description="스킬 ID 배열"),  # ✅ 사용언어 필터
    start_date: Optional[date] = Query(None, description="모집 시작일 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="모집 종료일 (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="검색어 (제목/설명)"),
    page: int = 1,
    page_size: int = 10,
):
    """
    게시판 목록 조회 API
    - 승인된 게시글만 가져옴 (status 기본값 = APPROVED)
    - 프로젝트/스터디 필터, 스킬 필터, 기간검색, 텍스트 검색 지원
    """

    query = (
        db.query(models.RecipePost)
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.members),
        )
        .filter(models.RecipePost.status == status)
    )

    if type:
        query = query.filter(models.RecipePost.type == type)

    if skill_ids:
        query = query.join(models.RecipePostSkill).filter(
            models.RecipePostSkill.skill_id.in_(skill_ids)
        )

    if start_date and end_date:
        query = query.filter(
            models.RecipePost.start_date <= end_date,
            models.RecipePost.end_date >= start_date,
        )

    if search:
        query = query.filter(
            (models.RecipePost.title.contains(search))
            | (models.RecipePost.description.contains(search))
        )

    posts = query.offset((page - 1) * page_size).limit(page_size).all()
    return [to_dto(post) for post in posts]


# ✅ 상세조회
@router.get("/{post_id}", response_model=RecipePostResponse)
async def get_post_detail(
    post_id: int,
    db: Session = Depends(get_db),
):
    post = (
        db.query(models.RecipePost)
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.members),
        )
        .filter(models.RecipePost.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    return to_dto(post)


# ✅ 게시글 수정
@router.put("/{post_id}", response_model=RecipePostResponse)
async def update_post(
    post_id: int,
    payload: RecipePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(models.RecipePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    for key, value in payload.dict().items():
        setattr(post, key, value)

    db.commit()
    db.refresh(post)

    return to_dto(post)


# ✅ 게시글 삭제
@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(models.RecipePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    db.delete(post)
    db.commit()
    return {"message": "✅ 게시글이 삭제되었습니다."}
