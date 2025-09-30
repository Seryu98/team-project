from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import auth_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router

app = FastAPI()

# ✅ CORS 허용
origins = [
    "http://localhost:5173",  # 프론트 개발 서버
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # 특정 주소만 허용 (["*"] 쓰면 전부 허용)
    allow_credentials=True,
    allow_methods=["*"],        # GET, POST, PUT, DELETE 전부 허용
    allow_headers=["*"],        # Authorization 같은 헤더도 허용
)

# ✅ 정적 파일 서빙
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ 라우터 등록
app.include_router(auth_router.router)
app.include_router(db_test.router)
app.include_router(profile_router.router)
app.include_router(follow_router.router)
app.include_router(skill_router.router)
