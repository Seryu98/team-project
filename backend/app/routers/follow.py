from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.follow import FollowOut
from app.services.follow_service import follow_user, unfollow_user, get_followers, get_followings
from app.models.user import User
from typing import List

router = APIRouter(prefix="/follows", tags=["follows"])


# ✅ 팔로우 추가
@router.post("/{target_id}", response_model=FollowOut)
def follow_target(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return follow_user(db, current_user.id, target_id)


# ✅ 팔로우 취소
@router.delete("/{target_id}", response_model=FollowOut)
def unfollow_target(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return unfollow_user(db, current_user.id, target_id)


# ✅ 팔로워 목록 조회
@router.get("/{user_id}/followers", response_model=List[FollowOut])
def get_user_followers(user_id: int, db: Session = Depends(get_db)):
    return get_followers(db, user_id)


# ✅ 팔로잉 목록 조회
@router.get("/{user_id}/followings", response_model=List[FollowOut])
def get_user_followings(user_id: int, db: Session = Depends(get_db)):
    return get_followings(db, user_id)
