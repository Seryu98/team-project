from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["Upload"])

# 업로드 경로
UPLOAD_DIR = "uploads"

# 폴더 없으면 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # 파일 확장자 추출
        ext = os.path.splitext(file.filename)[1]
        # 고유한 파일명 생성
        filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        # 파일 저장
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # URL 리턴 (프론트에서 그대로 image_url 저장 가능)
        return {"url": f"/uploads/{filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 업로드 실패: {str(e)}")