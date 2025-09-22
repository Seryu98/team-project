from fastapi import FastAPI
from .routers import user
from app.routers import db_test

app = FastAPI()

# 테이블은 이미 MySQL에 있으므로 create_all() 생략

app.include_router(user.router)
app.include_router(db_test.router)