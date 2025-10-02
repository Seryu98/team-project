# app/files/upload_router.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
import os
import hashlib
from typing import Optional

router = APIRouter(prefix="/upload", tags=["Upload"])

# 업로드 경로
PROFILE_UPLOAD_DIR = "uploads/profile_images"
PROJECT_UPLOAD_DIR = "uploads/project_images"

# 폴더 생성
os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)
os.makedirs(PROJECT_UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    type: Optional[str] = Query("project", description="업로드 타입: profile 또는 project")
):
    try:
        # 업로드 타입에 따라 폴더 선택
        if type == "profile":
            upload_dir = PROFILE_UPLOAD_DIR
            url_prefix = "/uploads/profile_images"
        else:
            upload_dir = PROJECT_UPLOAD_DIR
            url_prefix = "/uploads/project_images"

        # 파일 내용 읽기
        content = await file.read()

        # 파일 해시(SHA256) 생성 → 동일한 파일은 항상 같은 이름
        file_hash = hashlib.sha256(content).hexdigest()

        # 확장자 유지
        ext = os.path.splitext(file.filename)[1].lower()
        filename = f"{file_hash}{ext}"
        file_path = os.path.join(upload_dir, filename)

        # 파일이 이미 있지 않으면 저장
        if not os.path.exists(file_path):
            with open(file_path, "wb") as buffer:
                buffer.write(content)

        # URL 반환 (DB에 저장 가능)
        return {"url": f"{url_prefix}/{filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 업로드 실패: {str(e)}")
