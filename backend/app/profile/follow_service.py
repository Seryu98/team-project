from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.follow import Follow
from app.models.user import User

# ✅ 한국 시간대
KST = timezone(timedelta(hours=9))


# ✅ 팔로우 하기
def follow_user(db: Session, follower_id: int, following_id: int):
    if follower_id == following_id:
        raise HTTPException(status_code=400, detail="자기 자신은 팔로우할 수 없습니다.")

    # 대상 유저 확인
    target_user = db.query(User).filter(User.id == following_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="대상 유저를 찾을 수 없습니다.")

    follow = db.query(Follow).filter_by(
        follower_id=follower_id,
        following_id=following_id
    ).first()

    if follow:
        # ✅ 재팔로우 → 시간 덮어쓰기
        follow.created_at = datetime.now(KST)
        follow.deleted_at = None
    else:
        # ✅ 신규 팔로우
        follow = Follow(
            follower_id=follower_id,
            following_id=following_id,
            created_at=datetime.now(KST),
            deleted_at=None
        )
        db.add(follow)

    db.commit()
    db.refresh(follow)
    return follow


# ✅ 언팔로우 하기
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

    # ✅ deleted_at 한국시간으로 기록
    follow.deleted_at = datetime.now(KST)
    db.commit()
    db.refresh(follow)
    return {"success": True, "message": "언팔로우 성공"}



# ✅ 팔로워 목록
def get_followers(db: Session, user_id: int):
    followers = (
        db.query(Follow)
        .filter(Follow.following_id == user_id, Follow.deleted_at.is_(None))
        .all()
    )
    return followers


# ✅ 팔로잉 목록
def get_followings(db: Session, user_id: int):
    followings = (
        db.query(Follow)
        .filter(Follow.follower_id == user_id, Follow.deleted_at.is_(None))
        .all()
    )
    return followings
