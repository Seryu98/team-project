# main.py
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

# ✅ 경로 설정 (team-project 기준으로 assets 폴더 연결)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ASSETS_DIR = BASE_DIR / "frontend" / "src" / "shared" / "assets"
UPLOADS_DIR = BASE_DIR / "backend" / "uploads"

# 라우터 import
from app.auth import auth_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router
from app.project_post import recipe_router
from app.meta import meta_router
from app.files import upload_router

# 로깅 설정
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

os.makedirs("logs", exist_ok=True)

file_handler = RotatingFileHandler(
    "logs/app.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"
)
file_handler.setLevel(LOG_LEVEL)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(file_handler)

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)

# FastAPI 앱 설정
app = FastAPI(
    title="Team Project API",
    description="회원 관리 + 프로필 + 모집공고 API",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 정적 파일 마운트
# 업로드된 이미지 (유저 프로필 등)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# 프론트 assets (임시 프로필, 스킬, 별 아이콘 등)
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
    logging.info(f"✅ /assets 경로가 연결되었습니다 → {ASSETS_DIR}")
else:
    logging.warning(f"⚠️ assets 폴더를 찾을 수 없습니다: {ASSETS_DIR}")

# 라우터 등록
app.include_router(auth_router.router)
app.include_router(db_test.router)
app.include_router(profile_router.router)
app.include_router(follow_router.router)
app.include_router(skill_router.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)

# 기본 라우트
@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}

logging.info("🚀 FastAPI 서버가 시작되었습니다.")
