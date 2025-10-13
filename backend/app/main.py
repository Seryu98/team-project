# app/main.py
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import logging
import os
from logging.handlers import RotatingFileHandler

# ===================================
# 📦 라우터 import
# ===================================
from app.auth import auth_router, social_router  # ✅ 일반 로그인 + 소셜 로그인
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router
from app.project_post import recipe_router
from app.meta import meta_router
from app.files import upload_router
from app.board import board_router  # ✅ 추가
from app.users import user_router  # ✅ 계정관리(비밀번호 변경 포함) 추가

# ===================================
# 📜 로깅 설정
# ===================================
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

# 로그 폴더 생성
os.makedirs("logs", exist_ok=True)

file_handler = RotatingFileHandler(
    os.path.join("logs", "app.log"),
    maxBytes=2_000_000,
    backupCount=5,
    encoding="utf-8"
)
file_handler.setLevel(LOG_LEVEL)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(file_handler)

# SQLAlchemy 및 Uvicorn 관련 로그 레벨 조정
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)

# ===================================
# 🚀 FastAPI 앱 설정
# ===================================
app = FastAPI(
    title="Team Project API",
    description="회원 관리, 프로필, 모집공고, 게시판 API, 소셜 로그인 API 서버",
    version="1.0.0",
)

# ===================================
# 🌐 CORS 설정
# ===================================
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # 배포 시 아래 주석 해제
    # "https://your-production-domain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================================
# 🗂️ 정적 파일 (업로드 등)
# ===================================
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ===================================
# 🔗 라우터 등록
# ===================================
app.include_router(auth_router.router)     # 일반 회원 로그인/가입/비밀번호 관리
app.include_router(social_router.router)   # ✅ 소셜 로그인 전용 라우터
app.include_router(db_test.router)
app.include_router(profile_router.router)
app.include_router(follow_router.router)
app.include_router(skill_router.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)
app.include_router(board_router.router)  # ✅ 추가됨
app.include_router(user_router.router)  # ✅ 추가된 부분

# ===================================
# 🏠 기본 라우트
# ===================================
@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}

# ===================================
# 🧾 서버 시작 로그
# ===================================
logging.info("🚀 FastAPI 서버가 시작되었습니다.")