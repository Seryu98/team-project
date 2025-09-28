from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.follow import Follow
from app.models.profile import Profile
from app.models.user import User
from datetime import datetime

def follow_user(db: Session, follower_id: int, following_id: int):
    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="자기 자신은 팔로우할 수 없습니다.")

    # 유저 존재 확인
    if not db.query(User).filter(User.id == following_id).first():
        raise HTTPException(status_code=404, detail="팔로우 대상 유저를 찾을 수 없습니다.")

    follow = db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == following_id
    ).first()

    if follow and not follow.deleted_at:
        raise HTTPException(status_code=400, detail="이미 팔로우 중입니다.")

    if follow and follow.deleted_at:
        # soft delete 복구
        follow.deleted_at = None
    else:
        follow = Follow(follower_id=follower_id, following_id=following_id)
        db.add(follow)

    # 프로필 카운트 갱신
    follower_profile = db.query(Profile).filter(Profile.id == follower_id).first()
    following_profile = db.query(Profile).filter(Profile.id == following_id).first()
    follower_profile.following_count += 1
    following_profile.follower_count += 1

    db.commit()
    return follow


def unfollow_user(db: Session, follower_id: int, following_id: int):
    follow = db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == following_id,
        Follow.deleted_at.is_(None)
    ).first()

    if not follow:
        raise HTTPException(status_code=400, detail="팔로우 상태가 아닙니다.")

    follow.deleted_at = datetime.utcnow()

    # 프로필 카운트 갱신
    follower_profile = db.query(Profile).filter(Profile.id == follower_id).first()
    following_profile = db.query(Profile).filter(Profile.id == following_id).first()
    follower_profile.following_count -= 1
    following_profile.follower_count -= 1

    db.commit()
    return follow


def get_followers(db: Session, user_id: int):
    return db.query(Follow).filter(
        Follow.following_id == user_id,
        Follow.deleted_at.is_(None)
    ).all()


def get_followings(db: Session, user_id: int):
    return db.query(Follow).filter(
        Follow.follower_id == user_id,
        Follow.deleted_at.is_(None)
    ).all()
