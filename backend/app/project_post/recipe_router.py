#app/project_post/recipe_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload, aliased
from typing import List, Optional
from datetime import date, datetime, timedelta  # ✅ timedelta 추가 (쿨타임 계산용)
from sqlalchemy import func, text  # ✅ text 추가 (RAW SQL로 status_changed_at 다룸)
from app.profile.profile_model import Profile
from app.users.user_model import User

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

# ✅ models에 동적으로 할당
models.PostMember = PostMember
models.Application = Application

router = APIRouter(prefix="/recipe", tags=["recipe"])


# ---------------------------------------------------------------------
# ✅ 내부 유틸: 상태 자동 갱신
# ---------------------------------------------------------------------
def _apply_auto_state_updates_for_posts(db: Session, posts: List[models.RecipePost]):
    today = date.today()
    changed = False

    for post in posts:
        # 모집 기간 종료 시 자동 마감
        if post.end_date and post.end_date < today and post.recruit_status == "OPEN":
            post.recruit_status = "CLOSED"
            changed = True

        # 프로젝트 기간 종료 시 자동 종료
        if (
            post.project_end
            and post.project_end < today
            and post.project_status == "ONGOING"
        ):
            post.project_status = "ENDED"
            changed = True

        # 정원 자동 마감 처리
        if len(post.members) >= post.capacity and post.recruit_status == "OPEN":
            post.recruit_status = "CLOSED"
            changed = True
        # 정원 늘린 경우 자동 재개
        elif len(post.members) < post.capacity and post.recruit_status == "CLOSED":
            post.recruit_status = "OPEN"
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
    """게시글 → DTO 변환"""

    # ✅ 이미지 경로를 절대경로로 보정하는 헬퍼
    def _full_url(path: str | None):
        if not path:
            return None
        if path.startswith("http"):
            return path
        return f"http://localhost:8000{path}"  # ✅ 로컬 서버 기준

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
        image_url=_full_url(post.image_url),
        leader_id=post.leader_id,
        skills=[
            SkillResponse(id=s.skill.id, name=s.skill.name)
            for s in post.skills
        ],
        application_fields=[
            ApplicationFieldResponse(id=f.field.id, name=f.field.name)
            for f in post.application_fields
        ],
        members=[
            PostMemberResponse(
                user_id=m.user_id,
                role=m.role,
                nickname=getattr(m.user, "nickname", None),
                profile_image=_full_url(
                    getattr(m.user.profile, "profile_image", None)
                ),  # ✅ 여기서 절대경로로 보정
            )
            for m in post.members
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
# ✅ 모집공고 수정
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

    # 필드 갱신
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

    # skill 갱신
    db.query(models.RecipePostSkill).filter(models.RecipePostSkill.post_id == post.id).delete()
    for skill_id in payload.skills:
        db.add(models.RecipePostSkill(post_id=post.id, skill_id=skill_id))

    # field 갱신
    db.query(models.RecipePostRequiredField).filter(models.RecipePostRequiredField.post_id == post.id).delete()
    for field_id in payload.application_fields:
        db.add(models.RecipePostRequiredField(post_id=post.id, field_id=field_id))

    # ✅ 정원 변경 시 상태 자동 업데이트
    db.commit()
    _apply_auto_state_updates_for_single(db, post)
    db.refresh(post)
    return to_dto(post)


# ---------------------------------------------------------------------
# ✅ 모집공고 목록 조회 (페이지네이션 포함)
# ---------------------------------------------------------------------
@router.get("/list")
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
    # 상태 업데이트
    prescan = db.query(models.RecipePost).filter(
        models.RecipePost.status == status,
        models.RecipePost.deleted_at.is_(None)
    ).all()
    _apply_auto_state_updates_for_posts(db, prescan)

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

    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()
    has_next = page * page_size < total

    return {
        "items": [to_dto(post) for post in posts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": has_next,
    }


# ---------------------------------------------------------------------
# ✅ (⚠️ 라우팅 충돌 방지용) 내 프로젝트 / 내 지원 목록을
#    반드시 /{post_id} 보다 위에 둔다.
# ---------------------------------------------------------------------
@router.get("/my-projects", response_model=List[RecipePostResponse])
async def get_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None,  # ← Query 제거, 단순 Optional string
):
    """
    내가 참여 중인 프로젝트 목록 조회
    - status=ONGOING: 진행 중 프로젝트
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


@router.get("/my-applications", response_model=List[RecipePostResponse])
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    내가 지원한 프로젝트 중 아직 승인/거절 처리되지 않은 목록 (PENDING)
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
# ✅ 상세 조회 (프로필/상세 페이지 공통 사용)
# ---------------------------------------------------------------------
@router.get("/{post_id}", response_model=RecipePostResponse)
async def get_post_detail(post_id: int, db: Session = Depends(get_db)):
    ProfileAlias = aliased(Profile)

    post = (
        db.query(models.RecipePost)
        # ✅ 리더(User) + 프로필(Profile) Outer Join
        .join(User, models.RecipePost.leader_id == User.id)
        .outerjoin(ProfileAlias, ProfileAlias.id == User.id)
        .options(
            joinedload(models.RecipePost.skills).joinedload(models.RecipePostSkill.skill),
            joinedload(models.RecipePost.application_fields).joinedload(models.RecipePostRequiredField.field),
            joinedload(models.RecipePost.members)
                .joinedload(models.PostMember.user)
                .joinedload(User.profile),
        )
        .filter(models.RecipePost.id == post_id)
        .filter(models.RecipePost.deleted_at.is_(None))
        .first()
    )

    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    _apply_auto_state_updates_for_single(db, post)
    try:
        dto = to_dto(post)
    except Exception as e:
        import traceback
        print("❌ [DEBUG] 상세 to_dto 변환 중 오류 발생:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"DTO 변환 오류: {str(e)}")

    return dto



# ---------------------------------------------------------------------
# ✅ 지원서 제출 (중복신청 방지 + 정원 체크 + 모집상태 체크 + 24h 쿨타임)
#     - PENDING/APPROVED 상태만 재신청 차단 (REJECTED/WITHDRAWN 은 재신청 허용)
#     - 단, REJECTED/WITHDRAWN 후 24시간 이내엔 신청 불가
#     - 정원 가득/모집마감이면 신청 불가
# ---------------------------------------------------------------------
@router.post("/{post_id}/apply")
async def apply_post(
    post_id: int,
    answers: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(models.RecipePost)
        .filter(models.RecipePost.id == post_id, models.RecipePost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    # 1) 모집 상태 확인 (모집중이 아니면 신청 불가)
    if post.recruit_status != "OPEN":
        raise HTTPException(status_code=400, detail="모집이 마감되었습니다.")

    # 2) 정원 확인 (안전장치) - 현재 멤버 수가 정원 이상이면 차단
    current_members = (
        db.query(models.PostMember)
        .filter(models.PostMember.post_id == post_id)
        .count()
    )
    if current_members >= post.capacity:
        # 상태 불일치 보정
        if post.recruit_status != "CLOSED":
            post.recruit_status = "CLOSED"
            db.commit()
        raise HTTPException(status_code=400, detail="정원이 가득 찼습니다.")

    # 3) 중복 신청 방지 (PENDING/APPROVED 진행 중이면 차단)
    existing_app = (
        db.query(models.Application)
        .filter(
            models.Application.post_id == post_id,
            models.Application.user_id == current_user.id,
            models.Application.status.in_(["PENDING", "APPROVED"]),
        )
        .first()
    )
    if existing_app:
        raise HTTPException(status_code=400, detail="이미 지원 진행 중입니다.")

    # 4) ✅ 24시간 쿨타임 체크 (REJECTED / WITHDRAWN 최근 변경시각 기준)
    # 4) ✅ 24시간 쿨타임 체크 (REJECTED / WITHDRAWN / KICKED 최근 변경시각 기준)
    latest_row = db.execute(
        text(
            """
            SELECT status_changed_at, status
            FROM applications
            WHERE post_id = :post_id
            AND user_id = :user_id
            AND status IN ('REJECTED','WITHDRAWN','KICKED')
            ORDER BY COALESCE(status_changed_at, created_at) DESC
            LIMIT 1
            """
        ),
        {"post_id": post_id, "user_id": current_user.id},
    ).mappings().first()

    if latest_row:
        last_changed = latest_row["status_changed_at"]
        if latest_row["status"] == "KICKED":
            # 🚫 강퇴된 유저는 재신청 불가
            raise HTTPException(
                status_code=403,
                detail="이 프로젝트에서 제외된 유저는 다시 신청할 수 없습니다.",
            )

        if last_changed:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            if last_changed > cutoff:
                remaining = last_changed + timedelta(hours=24) - datetime.utcnow()
                remaining_sec = int(remaining.total_seconds())
                raise HTTPException(
                    status_code=403,
                    detail=f"쿨타임이 남았습니다. {remaining_sec}초 후 재신청 가능",
                )


    # 5) 신청 생성 (PENDING)
    application = models.Application(
        post_id=post_id,
        user_id=current_user.id,
        status="PENDING",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # 6) 지원자 답변 저장
    for ans in answers:
        db.add(
            models.ApplicationAnswer(
                application_id=application.id,
                field_id=ans["field_id"],
                answer_text=ans["answer_text"],
            )
        )
    db.commit()

    # 7) 이벤트 (있으면 호출)
    try:
        from app.events.events import on_application_submitted
        on_application_submitted(
            application_id=application.id,
            post_id=post.id,
            leader_id=post.leader_id,
            applicant_id=current_user.id,
        )
    except Exception:
        pass  # events 모듈 미존재/오류 시 무시

    return {"message": "✅ 지원 완료", "application_id": application.id}


# ---------------------------------------------------------------------
# ✅ 지원서 거절 (status_changed_at 기록)
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
        models.Application.post_id == post_id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="지원서 없음")

    # ✅ REJECTED + 변경시각 기록 (RAW SQL)
    db.execute(
        text(
            "UPDATE applications SET status='REJECTED', status_changed_at=:now WHERE id=:id"
        ),
        {"now": datetime.utcnow(), "id": application.id},
    )
    db.commit()

    # 이벤트 알림
    try:
        from app.events.events import on_application_decided
        on_application_decided(
            application_id=application.id,
            applicant_id=application.user_id,
            accepted=False,
        )
    except Exception:
        pass

    return {"message": "🚫 거절 처리 완료"}


# ---------------------------------------------------------------------
# ✅ 지원서 승인 (status_changed_at 기록)
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

    # 정원 초과 방지
    member_count = db.query(models.PostMember).filter(models.PostMember.post_id == post_id).count()
    if member_count >= post.capacity:
        post.recruit_status = "CLOSED"
        db.commit()
        raise HTTPException(status_code=400, detail="정원이 가득 찼습니다.")

    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.post_id == post_id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="지원서 없음")

    # ✅ 승인 처리 + 변경시각 기록 (RAW SQL)
    db.execute(
        text(
            "UPDATE applications SET status='APPROVED', status_changed_at=:now WHERE id=:id"
        ),
        {"now": datetime.utcnow(), "id": application.id},
    )
    db.add(models.PostMember(post_id=post_id, user_id=application.user_id, role="MEMBER"))
    db.commit()

    # 승인 후 정원 확인
    member_count = db.query(models.PostMember).filter(models.PostMember.post_id == post_id).count()
    if member_count >= post.capacity:
        post.recruit_status = "CLOSED"
        db.commit()

    # 이벤트 알림
    try:
        from app.events.events import on_application_decided
        on_application_decided(
            application_id=application.id,
            applicant_id=application.user_id,
            accepted=True,
        )
    except Exception:
        pass

    return {"message": "✅ 승인 완료"}


# ---------------------------------------------------------------------
# ✅ 모집 상태 수동 변경 (리더 전용)
# ---------------------------------------------------------------------
@router.post("/{post_id}/recruit-status", response_model=RecipePostResponse)
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
        models.RecipePost.deleted_at.is_(None),
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id:
        raise HTTPException(status_code=403, detail="리더만 변경 가능")

    # 정원 체크
    member_count = db.query(models.PostMember).filter(models.PostMember.post_id == post_id).count()
    if status_value == "OPEN" and member_count >= post.capacity:
        raise HTTPException(status_code=403, detail="정원이 가득 차서 모집을 열 수 없습니다.")

    # ✅ 상태 갱신
    post.recruit_status = status_value
    db.commit()
    db.refresh(post)

    # ✅ 최신 DTO 반환 (프론트 즉시 반영 가능)
    return to_dto(post)


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
        models.RecipePost.id == post_id, models.RecipePost.deleted_at.is_(None)
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
        models.RecipePost.id == post_id, models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    if current_user.id != post.leader_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    post.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "🗑 게시글이 삭제 처리되었습니다."}


# ---------------------------------------------------------------------
# ✅ 탈퇴하기 (정원 자동 open 포함) + WITHDRAWN 시각 기록
# ---------------------------------------------------------------------
@router.post("/{post_id}/leave")
async def leave_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = (
        db.query(models.RecipePost)
        .filter(models.RecipePost.id == post_id, models.RecipePost.deleted_at.is_(None))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id == post.leader_id:
        raise HTTPException(status_code=400, detail="리더는 탈퇴할 수 없습니다")

    membership = (
        db.query(models.PostMember)
        .filter(models.PostMember.post_id == post_id, models.PostMember.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=400, detail="참여중인 멤버가 아닙니다")

    # ✅ 멤버 삭제
    db.delete(membership)
    db.commit()

    # ✅ 기존 Application 상태 변경 (APPROVED → WITHDRAWN) + 변경시각 기록
    application = (
        db.query(models.Application)
        .filter(
            models.Application.post_id == post_id,
            models.Application.user_id == current_user.id,
            models.Application.status == "APPROVED",
        )
        .first()
    )
    if application:
        db.execute(
            text(
                "UPDATE applications SET status='WITHDRAWN', status_changed_at=:now WHERE id=:id"
            ),
            {"now": datetime.utcnow(), "id": application.id},
        )
        db.commit()

    # ✅ 탈퇴 후 인원 감소 → 자동 OPEN
    current_count = db.query(models.PostMember).filter(models.PostMember.post_id == post_id).count()
    if current_count < post.capacity and post.recruit_status == "CLOSED":
        post.recruit_status = "OPEN"
        db.commit()

    return {"message": "✅ 탈퇴 완료"}

@router.post("/{post_id}/kick/{user_id}")
async def kick_member(
    post_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    리더가 프로젝트에서 특정 멤버를 제외
    """
    post = db.query(models.RecipePost).filter(
        models.RecipePost.id == post_id,
        models.RecipePost.deleted_at.is_(None)
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글 없음")

    if current_user.id != post.leader_id:
        raise HTTPException(status_code=403, detail="리더만 멤버를 제외할 수 있습니다.")

    membership = (
        db.query(models.PostMember)
        .filter(
            models.PostMember.post_id == post_id,
            models.PostMember.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="해당 유저는 참여중이 아닙니다.")

    # ✅ PostMember 삭제
    db.delete(membership)
    db.commit()

    # ✅ Application 상태를 KICKED로 변경 (새 enum)
    db.execute(
        text(
            "UPDATE applications SET status='KICKED', status_changed_at=:now WHERE post_id=:post_id AND user_id=:user_id"
        ),
        {"now": datetime.utcnow(), "post_id": post_id, "user_id": user_id},
    )
    db.commit()

    # ✅ 정원 감소 → 자동 OPEN 처리
    current_count = db.query(models.PostMember).filter(
        models.PostMember.post_id == post_id
    ).count()
    if current_count < post.capacity and post.recruit_status == "CLOSED":
        post.recruit_status = "OPEN"
        db.commit()

    # ✅ 알림 이벤트 (있으면)
    try:
        from app.events.events import on_member_kicked
        on_member_kicked(
            post_id=post.id,
            leader_id=current_user.id,
            kicked_user_id=user_id,
        )
    except Exception:
        pass

    return {"message": "🚫 멤버를 제외했습니다."}
