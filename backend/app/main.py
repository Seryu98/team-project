#main
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 라우터 import
from app.auth import auth_router
from app.test import db_test
from app.project_post import recipe_router
from app.meta import meta_router
from app.files import upload_router

app = FastAPI(
    title="Team Project API",
    description="회원 관리 + 모집공고 API",
    version="1.0.0",
)

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite/React 개발 서버
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 정적 파일 (업로드 파일 접근 가능)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ 라우터 등록
app.include_router(auth_router.router)
app.include_router(db_test.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)


@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}
