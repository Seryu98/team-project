# app/main.py
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

import sys, traceback, logging, os
from logging.handlers import RotatingFileHandler

# ===================================
# 🚀 FastAPI 앱 생성
# ===================================
app = FastAPI(
    title="Team Project API",
    description="회원 관리, 프로필, 모집공고, 게시판 API, 소셜 로그인 API 서버",
    version="1.0.0",
)

# ===================================
# 🌐 CORS 설정 (라우터 등록보다 반드시 위)
# ===================================
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


# ===================================
# 📜 로깅 설정
# ===================================
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
os.makedirs("logs", exist_ok=True)
file_handler = RotatingFileHandler("logs/app.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
file_handler.setLevel(LOG_LEVEL)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(file_handler)

# ===================================
# 📦 라우터 import 및 등록
# ===================================
from app.auth import auth_router, social_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router
from app.project_post import recipe_router
from app.meta import meta_router
from app.files import upload_router
from app.board import board_router
from app.users import user_router

app.include_router(auth_router.router)
app.include_router(social_router.router)
app.include_router(db_test.router)
app.include_router(profile_router.router)
app.include_router(follow_router.router)
app.include_router(skill_router.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)
app.include_router(board_router.router)
app.include_router(user_router.router)


# ===================================
# 🗂️ 정적 파일
# ===================================
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ===================================
# 🏠 기본 라우트
# ===================================
@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}

logging.info("🚀 FastAPI 서버가 시작되었습니다.")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"\n🔥 [GLOBAL ERROR] 요청 경로: {request.url.path}")
        traceback.print_exc()  # stderr 말고 stdout으로!
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(e)}"},
        )
