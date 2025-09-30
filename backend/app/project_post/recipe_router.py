from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.project_post.recipe_schema import (
    RecipePostCreate,
    RecipePostResponse,
    PostMemberResponse,
)
from app.project_post import recipe_service, recipe_model as models
from app.users.user_model import User
from app.meta.meta_schema import SkillResponse, ApplicationFieldResponse

router = APIRouter(prefix="/recipe", tags=["recipe"])


# ✅ DTO 변환
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
        application_fields=[
            ApplicationFieldResponse(id=f.field.id, name=f.field.name)
            for f in post.application_fields
        ],
        members=[
            PostMemberResponse(user_id=m.user_id, role=m.role) for m in post.members
        ],  # ✅ 추가됨
    )


# 모집공고 생성
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


# ✅ 목록 조회 (삭제 제외)
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
        .filter(models.RecipePost.deleted_at.is_(None))
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


# ✅ 상세 조회
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
        .filter(models.RecipePost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
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
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    post.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "🗑 게시글이 삭제 처리되었습니다."}


# ✅ 지원서 제출
@router.post("/{post_id}/apply")
async def apply_post(
    post_id: int,
    answers: List[dict],   # {field_id: int, answer_text: str}
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    # 지원서 생성
    application = models.Application(post_id=post_id, user_id=current_user.id)
    db.add(application)
    db.commit()
    db.refresh(application)

    # 답변 저장
    for ans in answers:
        db.add(models.ApplicationAnswer(
            application_id=application.id,
            field_id=ans["field_id"],
            answer_text=ans["answer_text"]
        ))

    db.commit()
    return {"message": "✅ 지원 완료", "application_id": application.id}
