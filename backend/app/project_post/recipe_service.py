# app/project_post/recipe_service.py
from sqlalchemy.orm import Session
from app import models
from app.project_post.post_member_model import PostMember  # ✅ 추가
from datetime import date
from typing import Optional

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
        image_url=image_url,
        current_members=1,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # 리더 자동 등록
    leader_member = PostMember(  # ✅ 수정
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
    return new_post