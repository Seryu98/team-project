from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user import User
from app.models.profile import Profile
from app.models.skill import Skill
from app.models.user_skill import UserSkill  
# from app.models.post import Post, PostMember


def get_or_create_profile(db: Session, user_id: int) -> Profile:
    """
    유저의 프로필을 조회하거나 없으면 새로 생성해서 반환
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        # 유저 존재 여부 확인
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 기본 프로필 생성
        profile = Profile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def get_profile_detail(db: Session, user_id: int):
    """
    유저 상세 프로필 조회 (유저 기본정보 + 프로필 + 스킬 목록 + 프로젝트)
    """
    # 유저 확인
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # 프로필 확인 (없으면 자동 생성)
    profile = get_or_create_profile(db, user_id)

    # 스킬 목록
    user_skills = (
        db.query(UserSkill, Skill)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )
    skills_out = [
        {
            "id": skill.id,
            "name": skill.name,
            "level": user_skill.level,
            "icon": f"/assets/skills/{skill.name.lower()}.png"  # 프론트 자산
        }
        for user_skill, skill in user_skills
    ]

    # 진행 중인 프로젝트/스터디
    # projects = (
    #     db.query(Post)
    #     .join(PostMember, Post.id == PostMember.post_id)
    #     .filter(PostMember.user_id == user_id, Post.deleted_at == None)
    #     .all()
    # )
    # projects_out = [
    #     {"id": p.id, "title": p.title, "type": p.type}
    #     for p in projects
    # ]

    return {
        "id": user.id,
        "nickname": user.nickname,
        "email": user.email,
        "profile_image": profile.profile_image,
        "bio": profile.bio,
        "experience": profile.experience,
        "certifications": profile.certifications,
        "follower_count": profile.follower_count,
        "following_count": profile.following_count,
        "skills": skills_out,
        # "projects": projects_out,
    }