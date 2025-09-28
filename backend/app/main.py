# app/main.py
from fastapi import FastAPI
from app.routers import auth, profile, follow, skill, db_test

app = FastAPI()

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(follow.router)
app.include_router(skill.router)   
app.include_router(db_test.router)
