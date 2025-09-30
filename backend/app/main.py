from fastapi import FastAPI
from app.auth import auth_router
from app.test import db_test
from fastapi.middleware.cors import CORSMiddleware
from app.routers import db_test, auth, notifications, application

app = FastAPI()

# 테이블은 이미 MySQL에 있으므로 create_all() 생략

app.include_router(auth_router.router)   # 임시 로그인/회원가입 라우터
app.include_router(db_test.router)       # DB 연결 테스트 라우터
# ========================
# CORS 설정 추가
# ========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[  # 개발 환경에서 허용할 프론트 주소
        "http://localhost:5173",  # Vite 기본 포트
        "http://localhost:3000"   # React 기본 포트 (팀원 대비)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# 라우터 등록
# ========================
app.include_router(auth.router)          # 임시 로그인/회원가입 라우터
app.include_router(db_test.router)
app.include_router(notifications.router)
app.include_router(application.router)
