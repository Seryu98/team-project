# app/project_post/recipe_service.py
from sqlalchemy.orm import Session
from app import models
from datetime import date
from typing import Optional

DEFAULT_PROJECT_IMAGE = "/assets/profile/project.png"
DEFAULT_STUDY_IMAGE = "/assets/profile/study.png"

def create_recipe_post(
    db: Session,
    leader_id: int,
    title: str,
    description: Optional[str],
    capacity: int,
    type: str,
    field: Optional[str],
    start_date: Optional[date],
    end_date: Optional[date],
    project_start: Optional[date],
    project_end: Optional[date],
    skills: list[int],
    application_fields: list[int],
    image_url: Optional[str] = None,
):
    # ✅ 이미지 자동 세팅
    if not image_url:
        if type == "PROJECT":
            image_url = DEFAULT_PROJECT_IMAGE
        elif type == "STUDY":
            image_url = DEFAULT_STUDY_IMAGE

    new_post = models.RecipePost(
        leader_id=leader_id,
        type=type,
        title=title,
        field=field,
        capacity=capacity,
        description=description,
        start_date=start_date,
        end_date=end_date,
        project_start=project_start,
        project_end=project_end,
        image_url=image_url,   # ✅ 기본 이미지든 사용자 입력이든 최종 값 저장
        current_members=1,     # 리더 포함
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # 리더 자동 등록
    leader_member = models.PostMember(
        post_id=new_post.id, user_id=leader_id, role="LEADER"
    )
    db.add(leader_member)

    # 스킬 연결
    for skill_id in skills:
        db.add(models.RecipePostSkill(post_id=new_post.id, skill_id=skill_id))

    # 필수 입력값 연결
    for field_id in application_fields:
        db.add(models.RecipePostRequiredField(post_id=new_post.id, field_id=field_id))

    db.commit()
    db.refresh(new_post)

    # ✅ 게시글 생성 후 관리자 승인요청 알림 트리거
    from app.events.events import on_post_submitted
    on_post_submitted(post_id=new_post.id, leader_id=new_post.leader_id)

    return new_post
