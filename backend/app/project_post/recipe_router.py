# app/project_post/recipe_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.project_post.recipe_schema import (
    RecipePostCreate,
    RecipePostResponse,
    PostMemberResponse,
)
from app.project_post import recipe_service, recipe_model as models
from app.project_post.post_member_model import PostMember
from app.project_post.recipe_model import Application
from app.users.user_model import User
from app.meta.meta_schema import SkillResponse, ApplicationFieldResponse

# ✅ models에 동적으로 할당 (기존 코드에서 models.PostMember 사용 가능하도록)
models.PostMember = PostMember
models.Application = Application

router = APIRouter(prefix="/recipe", tags=["recipe"])


# ---------------------------------------------------------------------
# ✅ 내부 유틸: 조회 시점에 상태 자동 갱신
# ---------------------------------------------------------------------
def _apply_auto_state_updates_for_posts(db: Session, posts: List[models.RecipePost]):
    today = date.today()
    changed = False

    for post in posts:
        # 모집 자동 마감 처리
        if post.end_date and post.end_date < today and post.recruit_status == "OPEN":
            post.recruit_status = "CLOSED"
            changed = True

        # 프로젝트 자동 종료 처리
        if (
            post.project_end
            and post.project_end < today
            and post.project_status == "ONGOING"
        ):
            post.project_status = "ENDED"
            changed = True

    if changed:
        db.commit()


def _apply_auto_state_updates_for_single(db: Session, post: models.RecipePost):
    if not post:
        return
    _apply_auto_state_updates_for_posts(db, [post])


# ---------------------------------------------------------------------
# ✅ DTO 변환
# ---------------------------------------------------------------------
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
        project_start=getattr(post, "project_start", None),
        project_end=getattr(post, "project_end", None),
        project_status=getattr(post, "project_status", None),
        status=post.status,
        recruit_status=post.recruit_status,
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
        ],
    )


# ---------------------------------------------------------------------
# ✅ 모집공고 생성
# ---------------------------------------------------------------------
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


# ---------------------------------------------------------------------
# ✅ 모집공고 수정 (리더/관리자만 가능)
# ---------------------------------------------------------------------
@router.put("/{post_id}", response_model=RecipePostResponse)
async def update_post(
    post_id: int,
    payload: RecipePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="수정 권한 없음")

    # 기본 필드 갱신
    post.title = payload.title
    post.description = payload.description
    post.capacity = payload.capacity
    post.type = payload.type
    post.field = payload.field
    post.start_date = payload.start_date
    post.end_date = payload.end_date
    post.project_start = payload.project_start
    post.project_end = payload.project_end
    post.image_url = payload.image_url

    # ✅ skills 갱신
    db.query(models.RecipePostSkill).filter(models.RecipePostSkill.post_id == post.id).delete()
    for skill_id in payload.skills:
        db.add(models.RecipePostSkill(post_id=post.id, skill_id=skill_id))

    # ✅ application_fields 갱신
    db.query(models.RecipePostRequiredField).filter(models.RecipePostRequiredField.post_id == post.id).delete()
    for field_id in payload.application_fields:
        db.add(models.RecipePostRequiredField(post_id=post.id, field_id=field_id))

    db.commit()
    db.refresh(post)
    return to_dto(post)


# ---------------------------------------------------------------------
# ✅ 모집공고 목록 조회
# ---------------------------------------------------------------------
@router.get("/list", response_model=List[RecipePostResponse])
async def get_posts(
    db: Session = Depends(get_db),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query("APPROVED"),
    recruit_status: Optional[str] = Query("OPEN"),
    skill_ids: Optional[List[int]] = Query(None),
    match_mode: Optional[str] = Query("OR"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
):
    # 상태 갱신을 위한 pre-scan
    prescan_posts = (
        db.query(models.RecipePost)
        .filter(models.RecipePost.status == status)
        .filter(models.RecipePost.deleted_at.is_(None))
        .all()
    )
    _apply_auto_state_updates_for_posts(db, prescan_posts)

    # 실제 조회 쿼리
    query = (
        db.query(models.RecipePost)
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.application_fields).joinedload(models.RecipePostRequiredField.field),
            joinedload(models.RecipePost.members),
        )
        .filter(models.RecipePost.status == status)
        .filter(models.RecipePost.deleted_at.is_(None))
        .filter(getattr(models.RecipePost, "project_status") != "ENDED")
    )

    # 조건 필터링
    if recruit_status:
        query = query.filter(models.RecipePost.recruit_status == recruit_status)
    if type:
        query = query.filter(models.RecipePost.type == type)
    if skill_ids:
        if match_mode == "AND":
            query = (
                query.join(models.RecipePostSkill)
                .filter(models.RecipePostSkill.skill_id.in_(skill_ids))
                .group_by(models.RecipePost.id)
                .having(func.count(models.RecipePostSkill.skill_id) == len(skill_ids))
            )
        else:
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
            (models.RecipePost.title.contains(search)) |
            (models.RecipePost.description.contains(search))
        )
    
    query = query.order_by(models.RecipePost.created_at.desc())

    posts = query.offset((page - 1) * page_size).limit(page_size).all()
    return [to_dto(post) for post in posts]


# ---------------------------------------------------------------------
# ✅ 내 프로젝트 목록 조회 (⚠️ /{post_id} 앞으로 이동!)
# ---------------------------------------------------------------------
@router.get("/my-projects", response_model=List[RecipePostResponse])
async def get_my_projects(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    내가 참여 중인 프로젝트 목록 조회
    - status=ONGOING: 진행 중인 프로젝트
    - status=ENDED: 종료된 프로젝트
    """
    query = (
        db.query(models.RecipePost)
        .join(models.PostMember)
        .filter(
            models.PostMember.user_id == current_user.id,
            models.RecipePost.deleted_at.is_(None)
        )
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.application_fields).joinedload(models.RecipePostRequiredField.field),
            joinedload(models.RecipePost.members),
        )
    )
    
    if status:
        query = query.filter(models.RecipePost.project_status == status)
    
    posts = query.all()
    _apply_auto_state_updates_for_posts(db, posts)
    return [to_dto(post) for post in posts]


# ---------------------------------------------------------------------
# ✅ 내가 지원한 프로젝트 목록 (⚠️ /{post_id} 앞으로 이동!)
# ---------------------------------------------------------------------
@router.get("/my-applications", response_model=List[RecipePostResponse])
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    내가 지원한 프로젝트 중 아직 승인/거절 처리되지 않은 목록
    """
    applications = (
        db.query(models.Application)
        .filter(
            models.Application.user_id == current_user.id,
            models.Application.status == "PENDING"
        )
        .all()
    )
    
    if not applications:
        return []
    
    post_ids = [app.post_id for app in applications]
    
    posts = (
        db.query(models.RecipePost)
        .filter(
            models.RecipePost.id.in_(post_ids),
            models.RecipePost.deleted_at.is_(None)
        )
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.application_fields).joinedload(models.RecipePostRequiredField.field),
            joinedload(models.RecipePost.members),
        )
        .all()
    )
    
    _apply_auto_state_updates_for_posts(db, posts)
    return [to_dto(post) for post in posts]


# ---------------------------------------------------------------------
# ✅ 상세 조회 (⚠️ 이제 구체적 경로들 뒤에 위치!)
# ---------------------------------------------------------------------
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

    _apply_auto_state_updates_for_single(db, post)
    return to_dto(post)


# ---------------------------------------------------------------------
# ✅ 모집 상태 변경
# ---------------------------------------------------------------------
@router.post("/{post_id}/recruit-status")
async def update_recruit_status(
    post_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status_value = payload.get("status")
    if status_value not in ["OPEN", "CLOSED"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 상태입니다")

    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id:
        raise HTTPException(status_code=403, detail="리더만 변경 가능")

    post.recruit_status = status_value
    db.commit()
    return {"message": f"✅ 모집 상태가 {status_value}로 변경되었습니다."}


# ---------------------------------------------------------------------
# ✅ 프로젝트 종료
# ---------------------------------------------------------------------
@router.post("/{post_id}/end")
async def end_project(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id:
        raise HTTPException(status_code=403, detail="리더만 종료 가능")

    post.project_status = "ENDED"
    if post.recruit_status != "CLOSED":
        post.recruit_status = "CLOSED"

    db.commit()
    return {"message": "✅ 프로젝트가 종료되었습니다."}


# ---------------------------------------------------------------------
# ✅ 게시글 삭제 (Soft Delete)
# ---------------------------------------------------------------------
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


# ---------------------------------------------------------------------
# ✅ 지원서 제출
# ---------------------------------------------------------------------
@router.post("/{post_id}/apply")
async def apply_post(
    post_id: int,
    answers: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    application = models.Application(post_id=post_id, user_id=current_user.id)
    db.add(application)
    db.commit()
    db.refresh(application)

    # 지원자 답변 저장
    for ans in answers:
        db.add(models.ApplicationAnswer(
            application_id=application.id,
            field_id=ans["field_id"],
            answer_text=ans["answer_text"]
        ))

    db.commit()

    # ✅ 지원서 제출 시 리더 알림/메시지 전송
    try:
        from app.events.events import on_application_submitted
        on_application_submitted(
            application_id=application.id,
            post_id=post.id,
            leader_id=post.leader_id,
            applicant_id=current_user.id,
        )
    except ImportError:
        pass  # events 모듈이 없으면 스킵

    return {"message": "✅ 지원 완료", "application_id": application.id}


# ---------------------------------------------------------------------
# ✅ 지원서 승인
# ---------------------------------------------------------------------
@router.post("/{post_id}/applications/{application_id}/approve")
async def approve_application(
    post_id: int,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(models.RecipePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id:
        raise HTTPException(status_code=403, detail="리더만 승인 가능")

    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.post_id == post_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="지원서 없음")

    application.status = "APPROVED"
    db.add(models.PostMember(post_id=post_id, user_id=application.user_id, role="MEMBER"))
    db.commit()

    # ✅ 지원 승인 알림
    try:
        from app.events.events import on_application_decided
        on_application_decided(
            application_id=application.id,
            applicant_id=application.user_id,
            accepted=True,
        )
    except ImportError:
        pass  # events 모듈이 없으면 스킵

    return {"message": "✅ 승인 완료"}


# ---------------------------------------------------------------------
# ✅ 지원서 거절
# ---------------------------------------------------------------------
@router.post("/{post_id}/applications/{application_id}/reject")
async def reject_application(
    post_id: int,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(models.RecipePost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id:
        raise HTTPException(status_code=403, detail="리더만 거절 가능")

    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.post_id == post_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="지원서 없음")

    application.status = "REJECTED"
    db.commit()

    # ✅ 지원 거절 알림
    try:
        from app.events.events import on_application_decided
        on_application_decided(
            application_id=application.id,
            applicant_id=application.user_id,
            accepted=False,
        )
    except ImportError:
        pass  # events 모듈이 없으면 스킵
    
    return {"message": "🚫 거절 처리 완료"}


# ---------------------------------------------------------------------
# ✅ 탈퇴하기
# ---------------------------------------------------------------------
@router.post("/{post_id}/leave")
async def leave_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id == post.leader_id:
        raise HTTPException(status_code=400, detail="리더는 탈퇴할 수 없습니다")

    membership = db.query(models.PostMember).filter(
        models.PostMember.post_id == post_id,
        models.PostMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(status_code=400, detail="참여중인 멤버가 아닙니다")

    db.delete(membership)
    db.commit()
    return {"message": "✅ 탈퇴 완료"}