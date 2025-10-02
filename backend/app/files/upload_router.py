# app/files/upload_router.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from datetime import datetime
import hashlib

router = APIRouter(prefix="/upload", tags=["Upload"])

# 업로드 경로
UPLOAD_DIR = "uploads"

# 폴더 없으면 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # 파일 내용 읽기
        content = await file.read()

        # 파일 해시(SHA256) 생성 → 동일한 파일은 항상 같은 이름
        file_hash = hashlib.sha256(content).hexdigest()

        # 확장자 유지
        ext = os.path.splitext(file.filename)[1].lower()
        filename = f"{file_hash}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        # 파일이 이미 있지 않으면 저장
        if not os.path.exists(file_path):
            with open(file_path, "wb") as buffer:
                buffer.write(content)

        # URL 반환 (DB에 저장 가능)
        return {"url": f"/uploads/{filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 업로드 실패: {str(e)}")
