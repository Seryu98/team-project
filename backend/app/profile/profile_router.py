# app/profile/profile_router.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.profile.profile_schemas import ProfileOut, ProfileUpdate
from app.profile.profile_service import get_profile_detail, update_profile, get_or_create_profile
from app.core.deps import get_current_user
from app.models import User
from app.files import upload_router   # ✅ 업로드 모듈 가져오기

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ---------------------------------------------------------------------
# ✅ 내 프로필 조회
# ---------------------------------------------------------------------
@router.get("/me", response_model=ProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile_detail(db, current_user.id, current_user_id=current_user.id)


# ---------------------------------------------------------------------
# ✅ 특정 유저 프로필 조회
# ---------------------------------------------------------------------
@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile_detail(db, user_id, current_user_id=current_user.id)


# ---------------------------------------------------------------------
# ✅ 내 프로필 수정
# ---------------------------------------------------------------------
@router.put("/me", response_model=ProfileOut)
def update_my_profile(
    update_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_profile(db, current_user.id, update_data)


# ---------------------------------------------------------------------
# ✅ 프로필 이미지 업로드 (해시 기반 upload_router 재사용)
# ---------------------------------------------------------------------
@router.post("/me/image", response_model=ProfileOut)
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 👉 upload_router.upload_file 사용 (type="profile")
    result = await upload_router.upload_file(file=file, type="profile")
    image_url = result["url"]

    # DB 업데이트
    profile = get_or_create_profile(db, current_user.id)
    profile.profile_image = image_url
    db.commit()
    db.refresh(profile)

    return get_profile_detail(db, current_user.id, current_user_id=current_user.id)
