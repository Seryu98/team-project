from fastapi import FastAPI
from .routers import user

app = FastAPI()

# 테이블은 이미 MySQL에 있으므로 create_all() 생략

app.include_router(user.router)
