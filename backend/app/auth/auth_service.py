# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.users.user_model import User
from app.profile.profile_model import Profile  # ✅ 추가
from app.auth.auth_schema import UserRegister
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

# 로그인 실패/잠금 정책
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15

logger = logging.getLogger(__name__)


# ===============================
# 회원가입 처리
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
    
    # ✅ uploads 경로로 통일
    new_profile = Profile(
        id=new_user.id,
        profile_image="/uploads/profile_images/default_profile.png"
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    logger.info("회원가입 성공 id=%s email=%s", new_user.id, new_user.email)
    return new_user


# ===============================
# 계정 잠금 관련
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
        logger.warning("계정 잠금 user_id=%s until=%s", u.user_id, u.banned_until)


def _on_login_success(u: User) -> None:
    u.login_fail_count = 0
    u.account_locked = False
    u.banned_until = None
    u.last_login_at = datetime.utcnow()


# ===============================
# 사용자 인증
# ===============================
def authenticate_user(db: Session, user_id: str, password: str):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


# ===============================
# 로그인 처리 (Access + Refresh 발급)
# ===============================
def login_user(db: Session, form_data: OAuth2PasswordRequestForm):
    login_id = form_data.username  # username = user_id

    user = db.query(User).filter(User.user_id == login_id).first()
    if user and _is_locked(user):
        db.commit()
        logger.warning("잠금 상태 로그인 시도 user_id=%s", login_id)
        return None

    db_user = authenticate_user(db, login_id, form_data.password)
    if not db_user:
        if user:
            _on_login_fail(user)
            db.commit()
        logger.info("로그인 실패 user_id=%s", login_id)
        return None

    _on_login_success(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})

    logger.info("로그인 성공 user_id=%s id=%s", db_user.user_id, db_user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 초 단위
    }


# ===============================
# Refresh Token → 새 Access Token 발급
# ===============================
def refresh_access_token(refresh_token: str):
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