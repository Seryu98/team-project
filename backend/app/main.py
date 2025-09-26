from fastapi import FastAPI
from app.routers import db_test, auth

app = FastAPI()

# 테이블은 이미 MySQL에 있으므로 create_all() 생략

app.include_router(auth.router)   # 임시 로그인/회원가입 라우터
app.include_router(db_test.router)