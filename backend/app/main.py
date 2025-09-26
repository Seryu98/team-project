from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import db_test, auth
import app.routers.recipe_router as recipe_router
import app.routers.meta_router as meta_router
from app.routers import upload_router

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
app.include_router(auth.router)
app.include_router(db_test.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)

@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}