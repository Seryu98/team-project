# app/admin/admin_user_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.admin.admin_user_service import list_banned_users, unban_user

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

# ✅ 관리자 권한 확인
def _ensure_admin(user):
    if getattr(user, "role", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

# 🚫 제재된 유저 목록 조회
@router.get("/banned")
def api_list_banned_users(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_admin(user)
    users = list_banned_users(db)
    return {"success": True, "data": users, "message": "제재된 유저 목록 조회 성공"}

# 🔓 정지 해제
@router.post("/{user_id}/unban")
def api_unban_user(
    user_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_admin(user)
    ok = unban_user(user_id=user_id, admin_id=user.id, db=db)
    if not ok:
        raise HTTPException(status_code=404, detail="해당 유저를 찾을 수 없습니다.")
    return {"success": True, "message": "유저 정지 해제 완료"}
