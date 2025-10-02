# app/files/upload_router.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
import os
from datetime import datetime
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

        # 파일 확장자 추출
        ext = os.path.splitext(file.filename)[1]
        # 고유한 파일명 생성
        filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}{ext}"
        file_path = os.path.join(upload_dir, filename)

        # 파일 저장
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # URL 리턴
        return {"url": f"{url_prefix}/{filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 업로드 실패: {str(e)}")