# app/routers/profile.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import os
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.profile.profile_schemas import ProfileOut, ProfileUpdate
from app.profile.profile_service import (
    get_profile_detail,
    update_profile,
    get_or_create_profile,
)
from app.core.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/profiles", tags=["profiles"])

# 업로드 디렉토리 (없으면 자동 생성)
UPLOAD_DIR = "uploads/profile_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)  # ✅ 디렉토리 없으면 자동 생성


# ✅ 프로필 조회
@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    return get_profile_detail(db, user_id)


# ✅ 프로필 수정 (자기소개, 경력, 자격증, 생년월일, 성별 등)
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
    # 파일 확장자 확인
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".gif"]:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 형식입니다.")

    # 저장 경로 (user_{id}.{ext})
    save_path = os.path.join(UPLOAD_DIR, f"user_{current_user.id}{ext}")

    # 파일 저장
    with open(save_path, "wb") as buffer:
        buffer.write(file.file.read())

    # DB 업데이트: 항상 안전하게 프로필 확보 후 저장
    profile = get_or_create_profile(db, current_user.id)
    profile.profile_image = save_path
    db.commit()
    db.refresh(profile)

    # 최신 상세 정보 반환
    return get_profile_detail(db, current_user.id)
