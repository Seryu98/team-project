from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.project_post.recipe_schema import RecipePostCreate, RecipePostResponse
from app.project_post import recipe_service, recipe_model as models
from app.users.user_model import User
from app.meta.meta_schema import SkillResponse, ApplicationFieldResponse

router = APIRouter(prefix="/recipe", tags=["recipe"])


# ✅ DTO 변환 함수
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
        skills=[SkillResponse(id=s.skill.id, name=s.skill.name) for s in post.skills],
        application_fields=[ApplicationFieldResponse(id=f.field.id, name=f.field.name) for f in post.application_fields],
    )


# ✅ 모집공고 생성
@router.post("/", response_model=RecipePostResponse)
async def create_post(
    payload: RecipePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_post = recipe_service.create_recipe_post(
        db=db,
        leader_id=current_user.id,
        **payload.dict()
    )
    db.refresh(new_post)
    return to_dto(new_post)


# ✅ 목록 조회 (삭제된 게시글 제외)
@router.get("/list", response_model=List[RecipePostResponse])
async def get_posts(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query("APPROVED"),
    skill_ids: Optional[List[int]] = Query(None),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
):
    query = (
        db.query(models.RecipePost)
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.application_fields).joinedload(models.RecipePostRequiredField.field),
            joinedload(models.RecipePost.members),
        )
        .filter(models.RecipePost.status == status)
        .filter(models.RecipePost.deleted_at.is_(None))   # ✅ 삭제된 글 제외
    )

    if type:
        query = query.filter(models.RecipePost.type == type)

    if skill_ids:
        query = query.join(models.RecipePostSkill).filter(models.RecipePostSkill.skill_id.in_(skill_ids))

    if start_date and end_date:
        query = query.filter(
            models.RecipePost.start_date <= end_date,
            models.RecipePost.end_date >= start_date,
        )

    if search:
        query = query.filter(
            (models.RecipePost.title.contains(search)) |
            (models.RecipePost.description.contains(search))
        )

    posts = query.offset((page - 1) * page_size).limit(page_size).all()
    return [to_dto(post) for post in posts]


# ✅ 상세 조회 (삭제된 게시글 제외)
@router.get("/{post_id}", response_model=RecipePostResponse)
async def get_post_detail(post_id: int, db: Session = Depends(get_db)):
    post = (
        db.query(models.RecipePost)
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.application_fields).joinedload(models.RecipePostRequiredField.field),
            joinedload(models.RecipePost.members),
        )
        .filter(models.RecipePost.id == post_id)
        .filter(models.RecipePost.deleted_at.is_(None))   # ✅ 삭제된 글 제외
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
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)   # ✅ 삭제된 글 수정 방지
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    for key, value in payload.dict().items():
        setattr(post, key, value)

    db.commit()
    db.refresh(post)

    return to_dto(post)


# ✅ 게시글 삭제 (Soft Delete)
@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)   # ✅ 이미 삭제된 글은 다시 못 지움
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    post.deleted_at = datetime.utcnow()   # ✅ 실제 삭제 대신 삭제일 기록
    db.commit()
    return {"message": "🗑 게시글이 삭제 처리되었습니다."}
