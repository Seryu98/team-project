from dotenv import load_dotenv
load_dotenv()  # ✅ 가장 먼저 .env 로드

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import auth_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router

import logging
import os
from logging.handlers import RotatingFileHandler

# ---------------------------
# 공통 로깅 설정
# ---------------------------
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

# ---------------------------
# FastAPI 앱 설정
# ---------------------------
app = FastAPI()

# CORS 미들웨어
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

# 정적 파일 (프로필 이미지 등)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ 라우터 등록
app.include_router(auth_router.router)
app.include_router(db_test.router)
app.include_router(profile_router.router)   # 프로필
app.include_router(follow_router.router)    # 팔로우/팔로워
app.include_router(skill_router.router)     # 스킬

# ---------------------------
# 서버 실행 확인 로그
# ---------------------------
logging.info("🚀 FastAPI 서버가 시작되었습니다.")
