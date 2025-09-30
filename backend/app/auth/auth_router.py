from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.auth.auth_schema import UserRegister, UserLogin, TokenResponse
from app.auth import auth_service
from app.users.user_model import User

router = APIRouter(prefix="/auth", tags=["auth"])

# 회원가입
@router.post("/register", response_model=dict)
def register(user: UserRegister, db: Session = Depends(get_db)):
    new_user = auth_service.register_user(db, user)
    return {"success": True, "message": "User registered", "user_id": new_user.id}

# 로그인
@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    token = auth_service.login_user(db, user)
    if not token:
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    return token

# 현재 로그인 유저 확인
@router.get("/me", response_model=dict)
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nickname": current_user.nickname,
        "role": current_user.role,
    }
