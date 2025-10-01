from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.users.user_model import User
from app.profile.profile_model import Profile
from app.profile.skill_model import Skill
from app.profile.user_skill_model import UserSkill
from app.profile.profile_schemas import ProfileUpdate
from app.profile.follow_model import Follow  # ✅ 팔로우 모델


def get_or_create_profile(db: Session, user_id: int) -> Profile:
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        profile = Profile(id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def get_profile_detail(db: Session, user_id: int, current_user_id: int = None):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

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
            "icon": f"/assets/skills/{skill.name.lower()}.png",
        }
        for user_skill, skill in user_skills
    ]

    # ✅ 현재 로그인 유저가 팔로우했는지 여부
    is_following = False
    if current_user_id and current_user_id != user_id:
        follow = (
            db.query(Follow)
            .filter(
                Follow.follower_id == current_user_id,
                Follow.following_id == user_id,
                Follow.deleted_at.is_(None)
            )
            .first()
        )
        is_following = follow is not None

    # ✅ 팔로워/팔로잉 카운트
    follower_count = (
        db.query(Follow)
        .filter(Follow.following_id == user_id, Follow.deleted_at.is_(None))
        .count()
    )
    following_count = (
        db.query(Follow)
        .filter(Follow.follower_id == user_id, Follow.deleted_at.is_(None))
        .count()
    )

    return {
        "id": user.id,
        "nickname": user.nickname,
        "email": user.email,
        "profile_image": profile.profile_image,
        "headline": profile.headline,
        "bio": profile.bio,
        "experience": profile.experience,
        "certifications": profile.certifications,
        "birth_date": profile.birth_date,
        "gender": profile.gender,
        "follower_count": follower_count,
        "following_count": following_count,
        "skills": skills_out,
        "is_following": is_following,
    }


def update_profile(db: Session, user_id: int, update_data: ProfileUpdate):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    user = db.query(User).filter(User.id == user_id).first()

    if not profile or not user:
        raise HTTPException(status_code=404, detail="프로필을 찾을 수 없습니다.")

    # ✅ Profile 업데이트
    if update_data.headline is not None:
        profile.headline = update_data.headline
    if update_data.bio is not None:
        profile.bio = update_data.bio
    if update_data.experience is not None:
        profile.experience = update_data.experience
    if update_data.certifications is not None:
        profile.certifications = update_data.certifications
    if update_data.birth_date is not None:
        profile.birth_date = update_data.birth_date
    if update_data.gender is not None:
        profile.gender = update_data.gender

    # ✅ User 업데이트 (닉네임)
    if update_data.nickname is not None:
        exists = db.query(User).filter(User.nickname == update_data.nickname, User.id != user_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
        user.nickname = update_data.nickname

    db.commit()
    db.refresh(profile)
    db.refresh(user)

    return get_profile_detail(db, user_id, user_id)
