# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import auth_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router
from fastapi.staticfiles import StaticFiles

# FastAPI 앱 설정
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
