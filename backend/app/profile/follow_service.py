from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.profile.follow_model import Follow
from app.users.user_model import User
from app.profile.profile_model import Profile


def follow_user(db: Session, follower_id: int, following_id: int):
    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="자기 자신은 팔로우할 수 없습니다.")

    target_user = db.query(User).filter(User.id == following_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="대상 유저를 찾을 수 없습니다.")

    follow = db.query(Follow).filter_by(
        follower_id=follower_id,
        following_id=following_id
    ).first()

    if follow:
        follow.created_at = datetime.utcnow()  # ✅ UTC로 변경
        follow.deleted_at = None
    else:
        follow = Follow(
            follower_id=follower_id,
            following_id=following_id,
            created_at=datetime.utcnow(),  # ✅ UTC로 변경
            deleted_at=None
        )
        db.add(follow)

    db.commit()
    return {
        "success": True,
        "message": "팔로우 성공",
        "is_following": True,
        "target_id": following_id
    }


def unfollow_user(db: Session, follower_id: int, following_id: int):
    follow = (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.following_id == following_id)
        .first()
    )

    if not follow:
        raise HTTPException(status_code=404, detail="팔로우 관계가 존재하지 않습니다.")

    if follow.deleted_at is not None:
        raise HTTPException(status_code=400, detail="이미 언팔로우된 상태입니다.")

    follow.deleted_at = datetime.utcnow()  # ✅ UTC로 변경
    db.commit()
    return {
        "success": True,
        "message": "언팔로우 성공",
        "is_following": False,
        "target_id": following_id
    }


def get_followers(db: Session, user_id: int, current_user_id: int = None):
    followers = (
        db.query(Follow, User, Profile)
        .join(User, Follow.follower_id == User.id)
        .join(Profile, Profile.id == User.id)
        .filter(Follow.following_id == user_id, Follow.deleted_at.is_(None))
        .all()
    )

    result = []
    for _, user, profile in followers:
        is_following = False
        if current_user_id:
            check = (
                db.query(Follow)
                .filter(
                    Follow.follower_id == current_user_id,
                    Follow.following_id == user.id,
                    Follow.deleted_at.is_(None)
                )
                .first()
            )
            is_following = bool(check)

        result.append({
            "id": user.id,
            "nickname": user.nickname,
            "profile_image": profile.profile_image,
            "headline": profile.headline,
            "is_following": is_following,
        })
    return result


def get_followings(db: Session, user_id: int, current_user_id: int = None):
    followings = (
        db.query(Follow, User, Profile)
        .join(User, Follow.following_id == User.id)
        .join(Profile, Profile.id == User.id)
        .filter(Follow.follower_id == user_id, Follow.deleted_at.is_(None))
        .all()
    )

    result = []
    for _, user, profile in followings:
        is_following = False
        if current_user_id:
            check = (
                db.query(Follow)
                .filter(
                    Follow.follower_id == current_user_id,
                    Follow.following_id == user.id,
                    Follow.deleted_at.is_(None)
                )
                .first()
            )
            is_following = bool(check)

        result.append({
            "id": user.id,
            "nickname": user.nickname,
            "profile_image": profile.profile_image,
            "headline": profile.headline,
            "is_following": is_following,
        })
    return result