# app/services/auth_service.py

from sqlalchemy.orm import Session
from app import models
from app.schemas.auth import UserRegister, UserLogin
from app.core.security import hash_password, verify_password, create_access_token
from datetime import timedelta

ACCESS_TOKEN_EXPIRE_MINUTES = 60

def register_user(db: Session, user: UserRegister):
    exists = db.query(models.User).filter(models.User.email == user.email).first()
    if exists:
        raise ValueError("이미 존재하는 이메일입니다.")

    new_user = models.User(
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


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def login_user(db: Session, user: UserLogin):
    db_user = authenticate_user(db, user.email, user.password)
    if not db_user:
        return None

    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}
