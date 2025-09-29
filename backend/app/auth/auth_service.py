# app/auth/auth_service.py
from sqlalchemy.orm import Session
from app.users.user_model import User
from app.auth.auth_schema import UserRegister
from app.core.security import hash_password, verify_password, create_access_token
from datetime import timedelta, datetime
from fastapi.security import OAuth2PasswordRequestForm

ACCESS_TOKEN_EXPIRE_MINUTES = 60

# 회원가입 처리
def register_user(db: Session, user: UserRegister):
    exists = db.query(User).filter(User.email == user.email).first()
    if exists:
        raise ValueError("이미 존재하는 이메일입니다.")

    new_user = User(
        email=user.email,
        user_id=user.user_id,
        password_hash=hash_password(user.password),
        name=user.name,
        nickname=user.nickname,
        phone_number=user.phone_number,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 사용자 인증
def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

# 로그인 처리 및 토큰 발급 (OAuth2PasswordRequestForm)
def login_user(db: Session, form_data: OAuth2PasswordRequestForm):
    db_user = authenticate_user(db, form_data.username, form_data.password)
    if not db_user:
        return None

    # 마지막 로그인 시각 업데이트
    db_user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}