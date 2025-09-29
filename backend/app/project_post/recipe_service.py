from sqlalchemy.orm import Session
from app import models

def create_recipe_post(
    db: Session,
    leader_id: int,
    title: str,
    description: str,
    capacity: int,
    type: str,
    field: str,
    start_date: str,
    end_date: str,
    skills: list[int],
    required_fields: list[int],
    image_url: str = None,
):
    """
    모집공고 생성 서비스
    - 리더 자동 참여
    - current_members = 1 로 초기화
    """
    new_post = models.RecipePost(
        leader_id=leader_id,
        type=type,
        title=title,
        field=field,
        capacity=capacity,
        description=description,
        start_date=start_date,
        end_date=end_date,
        image_url=image_url,
        current_members=1,  # ✅ DB에 바로 반영
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    # ▶ 리더 멤버 등록
    leader_member = models.PostMember(
        post_id=new_post.id,
        user_id=leader_id,
        role="LEADER",
    )
    db.add(leader_member)

    # ▶ 스킬 연결
    for skill_id in skills:
        db.add(models.RecipePostSkill(post_id=new_post.id, skill_id=skill_id))

    # ▶ 필수 질문 연결
    for field_id in required_fields:
        db.add(models.RecipePostRequiredField(post_id=new_post.id, field_id=field_id))

    db.commit()
    return new_post
