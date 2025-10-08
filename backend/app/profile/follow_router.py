# app/profile/follow_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User, Follow, Profile

# ✅ prefix를 /follows로 설정 (프론트엔드 경로에 맞춤)
router = APIRouter(prefix="/follows", tags=["follow"])


@router.post("/{user_id}")
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """유저 팔로우"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신을 팔로우할 수 없습니다")
    
    # ✅ 모든 팔로우 관계 확인 (deleted 포함)
    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id
    ).first()
    
    # ✅ 이미 활성 팔로우가 있는 경우
    if existing and existing.deleted_at is None:
        raise HTTPException(status_code=400, detail="이미 팔로우 중입니다")
    
    # ✅ soft delete된 팔로우가 있는 경우 → 복구
    if existing and existing.deleted_at is not None:
        existing.deleted_at = None
        
        # 카운트 증가
        following_profile = db.query(Profile).filter(Profile.id == user_id).first()
        if following_profile:
            following_profile.follower_count += 1
        
        follower_profile = db.query(Profile).filter(Profile.id == current_user.id).first()
        if follower_profile:
            follower_profile.following_count += 1
        
        db.commit()
        return {"message": "팔로우 완료"}
    
    # ✅ 새로운 팔로우 관계 생성
    follow = Follow(follower_id=current_user.id, following_id=user_id)
    db.add(follow)
    
    # 카운트 증가
    following_profile = db.query(Profile).filter(Profile.id == user_id).first()
    if following_profile:
        following_profile.follower_count += 1
    
    follower_profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    if follower_profile:
        follower_profile.following_count += 1
    
    db.commit()
    
    return {"message": "팔로우 완료"}


@router.delete("/{user_id}")
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """유저 언팔로우"""
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
        Follow.deleted_at.is_(None)
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="팔로우 관계가 존재하지 않습니다")
    
    # 팔로우 관계 삭제 (soft delete)
    from datetime import datetime
    follow.deleted_at = datetime.now()
    
    # ✅ 팔로워 카운트 감소 (팔로우 받는 사람)
    following_profile = db.query(Profile).filter(Profile.id == user_id).first()
    if following_profile and following_profile.follower_count > 0:
        following_profile.follower_count -= 1
    
    # ✅ 팔로잉 카운트 감소 (팔로우 하는 사람)
    follower_profile = db.query(Profile).filter(Profile.id == current_user.id).first()
    if follower_profile and follower_profile.following_count > 0:
        follower_profile.following_count -= 1
    
    db.commit()
    
    return {"message": "언팔로우 완료"}


@router.get("/{user_id}/followers")
def get_followers(
    user_id: int,
    db: Session = Depends(get_db),
):
    """특정 유저의 팔로워 목록"""
    followers = (
        db.query(User)
        .join(Follow, Follow.follower_id == User.id)
        .filter(
            Follow.following_id == user_id,
            Follow.deleted_at.is_(None)
        )
        .all()
    )
    
    return [
        {
            "id": user.id,
            "nickname": user.nickname,
            "profile_image": db.query(Profile).filter(Profile.id == user.id).first().profile_image
        }
        for user in followers
    ]


@router.get("/{user_id}/following")
def get_following(
    user_id: int,
    db: Session = Depends(get_db),
):
    """특정 유저가 팔로우하는 목록"""
    following = (
        db.query(User)
        .join(Follow, Follow.following_id == User.id)
        .filter(
            Follow.follower_id == user_id,
            Follow.deleted_at.is_(None)
        )
        .all()
    )
    
    return [
        {
            "id": user.id,
            "nickname": user.nickname,
            "profile_image": db.query(Profile).filter(Profile.id == user.id).first().profile_image
        }
        for user in following
    ]