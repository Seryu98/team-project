# main.py
from dotenv import load_dotenv
load_dotenv()  # ✅ 가장 먼저 .env 로드

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import logging
import os
from logging.handlers import RotatingFileHandler

# 라우터 import
from app.auth import auth_router
from app.test import db_test
from app.project_post import recipe_router
from app.meta import meta_router
from app.files import upload_router

# -------------------------------
# 공통 로깅 설정
# -------------------------------
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

# logs/ 폴더 자동 생성
os.makedirs("logs", exist_ok=True)

# 파일 로그 (순환)
file_handler = RotatingFileHandler(
    "logs/app.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"
)
file_handler.setLevel(LOG_LEVEL)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(file_handler)

# 불필요한 로그 줄이기
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)

# -------------------------------
# FastAPI 앱 설정
# -------------------------------
app = FastAPI(
    title="Team Project API",
    description="회원 관리 + 모집공고 API",
    version="1.0.0",
)

# CORS 미들웨어
origins = [
    "http://localhost:5173",  # Vite/React 개발 서버
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # "*" 대신 구체적으로
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 (업로드 파일 접근 가능)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -------------------------------
# 라우터 등록
# -------------------------------
app.include_router(auth_router.router)
app.include_router(db_test.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)

# -------------------------------
# 기본 라우트
# -------------------------------
@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}

# 서버 실행 확인 로그
logging.info("🚀 FastAPI 서버가 시작되었습니다.")
