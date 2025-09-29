from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import auth_router
from app.test import db_test

app = FastAPI()

# ✅ CORS 미들웨어
origins = [
    "http://localhost:5173",  # React 개발 서버
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # "*" 대신 구체적으로
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth_router.router)
app.include_router(db_test.router)