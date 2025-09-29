from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.services.follow_service import (
    follow_user,
    unfollow_user,
    get_followers,
    get_followings,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/follows", tags=["follows"])


# ✅ 팔로우하기
@router.post("/{target_id}")
def follow_target(target_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return follow_user(db, current_user.id, target_id)


# ✅ 언팔로우하기
@router.delete("/{target_id}")
def unfollow_target(target_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return unfollow_user(db, current_user.id, target_id)


# ✅ 특정 유저의 팔로워 목록
@router.get("/{user_id}/followers")
def get_user_followers(user_id: int, db: Session = Depends(get_db)):
    return get_followers(db, user_id)


# ✅ 특정 유저의 팔로잉 목록
@router.get("/{user_id}/followings")
def get_user_followings(user_id: int, db: Session = Depends(get_db)):
    return get_followings(db, user_id)
