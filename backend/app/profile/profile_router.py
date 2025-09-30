# app/routers/profile.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.profile.profile_schemas import ProfileOut, ProfileUpdate
from app.profile.profile_service import get_profile_detail, update_profile, get_or_create_profile
from app.core.deps import get_current_user
from app.models import User
import os

router = APIRouter(prefix="/profiles", tags=["profiles"])

UPLOAD_DIR = "uploads/profile_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ✅ 내 프로필 조회
@router.get("/me", response_model=ProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile_detail(db, current_user.id, current_user_id=current_user.id)

# ✅ 특정 유저 프로필 조회
@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),   # ✅ 로그인 유저 가져오기
):
    return get_profile_detail(db, user_id, current_user_id=current_user.id)

# ✅ 프로필 수정
@router.put("/me", response_model=ProfileOut)
def update_my_profile(
    update_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_profile(db, current_user.id, update_data)

# ✅ 프로필 이미지 업로드
@router.post("/me/image", response_model=ProfileOut)
def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 형식입니다.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".gif"]:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 확장자입니다.")

    save_filename = f"user_{current_user.id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, save_filename)

    with open(save_path, "wb") as buffer:
        buffer.write(file.file.read())

    profile = get_or_create_profile(db, current_user.id)
    profile.profile_image = f"/uploads/profile_images/{save_filename}"
    db.commit()
    db.refresh(profile)

    return get_profile_detail(db, current_user.id, current_user_id=current_user.id)
