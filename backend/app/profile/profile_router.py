# app/profile/profile_router.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.profile.profile_schemas import ProfileOut, ProfileUpdate
from app.profile.profile_service import get_profile_detail, update_profile, get_or_create_profile
from app.core.deps import get_current_user
from app.models import User
import os
from datetime import datetime

router = APIRouter(prefix="/profiles", tags=["profiles"])

UPLOAD_DIR = "uploads/profile_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/me", response_model=ProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile_detail(db, current_user.id, current_user_id=current_user.id)

@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile_detail(db, user_id, current_user_id=current_user.id)

@router.put("/me", response_model=ProfileOut)
def update_my_profile(
    update_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_profile(db, current_user.id, update_data)

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

    # 고유 파일명 생성 (타임스탬프 포함)
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    save_filename = f"user_{current_user.id}_{timestamp}{ext}"
    save_path = os.path.join(UPLOAD_DIR, save_filename)

    with open(save_path, "wb") as buffer:
        buffer.write(file.file.read())

    profile = get_or_create_profile(db, current_user.id)
    profile.profile_image = f"/uploads/profile_images/{save_filename}"
    db.commit()
    db.refresh(profile)

    return get_profile_detail(db, current_user.id, current_user_id=current_user.id)