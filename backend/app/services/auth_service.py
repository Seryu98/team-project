# app/services/auth_service.py
from sqlalchemy.orm import Session
from app import models
from app.schemas.auth import UserRegister, UserLogin
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status

# 회원가입 처리
def register_user(db: Session, user: UserRegister):
    # 이메일 중복 확인
    exists = db.query(models.User).filter(models.User.email == user.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 새 유저 생성 (비밀번호는 해시 저장)
    new_user = models.User(
        email=user.email,
        user_id=user.email,  # 임시로 이메일을 로그인 ID로 사용
        password_hash=hash_password(user.password),
        name=user.name,
        nickname=user.nickname,
        phone_number=user.phone_number,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 로그인 처리
def login_user(db: Session, user: UserLogin):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    # 이메일/비밀번호 검증
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # JWT 토큰 발급
    token = create_access_token({"sub": str(db_user.id)})
    return {"access_token": token, "token_type": "bearer"}