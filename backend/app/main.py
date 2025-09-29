from fastapi import FastAPI
from app.auth import auth_router
from app.test import db_test

app = FastAPI()

# 테이블은 이미 MySQL에 있으므로 create_all() 생략

app.include_router(auth_router.router)   # 임시 로그인/회원가입 라우터
app.include_router(db_test.router)       # DB 연결 테스트 라우터