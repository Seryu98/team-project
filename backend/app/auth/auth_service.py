# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.users.user_model import User
from app.auth.auth_schema import UserRegister
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.core.database import get_db  # ✅ DB 의존성 주입용

# ===============================
# 정책 상수
# ===============================
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15
RESET_TOKEN_EXPIRE_MINUTES = 30  # 비밀번호 재설정 토큰 만료시간

logger = logging.getLogger(__name__)

# OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ===============================
# 🔹 회원가입 처리
# ===============================
def register_user(db: Session, user: UserRegister) -> User:
    if db.query(User).filter(User.email == user.email).first():
        raise ValueError("이미 존재하는 이메일입니다.")
    if db.query(User).filter(User.user_id == user.user_id).first():
        raise ValueError("이미 존재하는 아이디입니다.")
    if db.query(User).filter(User.nickname == user.nickname).first():
        raise ValueError("이미 존재하는 닉네임입니다.")

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
    logger.info("회원가입 성공: id=%s email=%s", new_user.id, new_user.email)
    return new_user


# ===============================
# 🔹 계정 잠금 관련
# ===============================
def _is_locked(u: User) -> bool:
    if not u:
        return False
    now = datetime.utcnow()
    if u.account_locked and u.banned_until and u.banned_until > now:
        return True
    if u.account_locked and u.banned_until and u.banned_until <= now:
        # 잠금 해제
        u.account_locked = False
        u.login_fail_count = 0
        u.banned_until = None
    return False


def _on_login_fail(u: User) -> None:
    if not u:
        return
    u.login_fail_count = (u.login_fail_count or 0) + 1
    u.last_fail_time = datetime.utcnow()
    if u.login_fail_count >= MAX_LOGIN_FAILS:
        u.account_locked = True
        u.banned_until = datetime.utcnow() + timedelta(minutes=LOCK_TIME_MINUTES)
        logger.warning("계정 잠금: user_id=%s until=%s", u.user_id, u.banned_until)


def _on_login_success(u: User) -> None:
    u.login_fail_count = 0
    u.account_locked = False
    u.banned_until = None
    u.last_login_at = datetime.utcnow()


# ===============================
# 🔹 사용자 인증
# ===============================
def authenticate_user(db: Session, user_id: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


# ===============================
# 🔹 로그인 처리 (Access + Refresh 발급)
# ===============================
def login_user(db: Session, form_data: OAuth2PasswordRequestForm) -> Optional[dict]:
    login_id = form_data.username

    user = db.query(User).filter(User.user_id == login_id).first()
    if user and _is_locked(user):
        db.commit()
        logger.warning("잠금 상태 로그인 시도: user_id=%s", login_id)
        return None

    db_user = authenticate_user(db, login_id, form_data.password)
    if not db_user:
        if user:
            _on_login_fail(user)
            db.commit()
        logger.info("로그인 실패: user_id=%s", login_id)
        return None

    _on_login_success(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})

    logger.info("로그인 성공: user_id=%s id=%s", db_user.user_id, db_user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ===============================
# 🔹 Refresh Token → 새 Access Token 발급
# ===============================
def refresh_access_token(refresh_token: str) -> Optional[dict]:
    payload = verify_token(refresh_token, expected_type="refresh")
    if not payload:
        logger.warning("잘못된 리프레시 토큰 사용")
        return None

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("리프레시 토큰에 사용자 ID 없음")
        return None

    new_access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ===============================
# 🔹 비밀번호 재설정 토큰 발급
# ===============================
def generate_reset_token(db: Session, email: str) -> Optional[str]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        logger.warning("비밀번호 재설정 실패: 존재하지 않는 이메일 %s", email)
        return None
    if not user.password_hash:  # 소셜 계정은 password_hash 없음
        logger.warning("비밀번호 재설정 실패: 소셜 계정 %s", email)
        return None

    reset_token = create_reset_token(data={"sub": str(user.id)})
    logger.info("비밀번호 재설정 토큰 발급: user_id=%s", user.user_id)
    return reset_token


# ===============================
# 🔹 비밀번호 재설정 실행
# ===============================
def reset_password(db: Session, reset_token: str, new_password: str) -> bool:
    payload = verify_token(reset_token, expected_type="reset")
    if not payload:
        logger.warning("비밀번호 재설정 실패: 잘못된 토큰")
        return False

    user_id = payload.get("sub")
    if not user_id:
        return False

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.password_hash:
        return False

    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    logger.info("비밀번호 재설정 성공: user_id=%s", user.user_id)
    return True


# ===============================
# 🔹 현재 로그인된 사용자 조회 (JWT 기반)
# ===============================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """JWT Access Token 기반으로 현재 로그인된 사용자 조회"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 사용자 정보가 없습니다.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return user
