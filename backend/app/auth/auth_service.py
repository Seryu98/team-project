# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.users.user_model import User
from app.auth.auth_schema import UserRegister
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

ACCESS_TOKEN_EXPIRE_MINUTES = 60


# 로그인 실패/잠금 정책 (요구사항 8 반영)
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15

logger = logging.getLogger(__name__)


# 회원가입 처리
def register_user(db: Session, user: UserRegister) -> User:
    """
    이메일/아이디/닉네임 중복 검사 후 생성.
    비밀번호는 bcrypt 해시로 저장.
    """
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
    logger.info("회원가입 성공 id=%s email=%s", new_user.id, new_user.email)
    return new_user


def _is_locked(u: User) -> bool:
    """계정 잠금 여부 체크(만료시 자동 해제)."""
    if not u:
        return False
    now = datetime.utcnow()
    if u.account_locked and u.banned_until and u.banned_until > now:
        return True
    # 잠금 만료 시 자동 해제
    if u.account_locked and u.banned_until and u.banned_until <= now:
        u.account_locked = False
        u.login_fail_count = 0
        u.banned_until = None
    return False


def _on_login_fail(u: User) -> None:
    """로그인 실패 처리(횟수 증가 및 잠금)."""
    if not u:
        return
    u.login_fail_count = (u.login_fail_count or 0) + 1
    u.last_fail_time = datetime.utcnow()
    if u.login_fail_count >= MAX_LOGIN_FAILS:
        u.account_locked = True
        u.banned_until = datetime.utcnow() + timedelta(minutes=LOCK_TIME_MINUTES)
        logger.warning(
            "계정 잠금 user_id=%s until=%s", u.user_id, u.banned_until
        )


def _on_login_success(u: User) -> None:
    """로그인 성공 처리(실패횟수 초기화, 마지막 로그인 시각)."""
    u.login_fail_count = 0
    u.account_locked = False
    u.banned_until = None
    u.last_login_at = datetime.utcnow()


# 사용자 인증 (아이디 기반)
def authenticate_user(db: Session, user_id: str, password: str):
    """
    로그인 아이디(user_id)로 조회 후 비밀번호 검증.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


# 로그인 처리 및 토큰 발급 (OAuth2PasswordRequestForm)
def login_user(db: Session, form_data: OAuth2PasswordRequestForm):
    """
    FastAPI OAuth2PasswordRequestForm의 username 필드에 user_id를 담아 호출한다.
    - 잠금 계정은 토큰 발급하지 않음
    - 성공 시 실패 카운터/잠금 해제 및 마지막 로그인 갱신
    """
    login_id = form_data.username  # ← user_id가 들어있음

    # 우선 해당 유저 가져와 잠금 여부 판단
    user = db.query(User).filter(User.user_id == login_id).first()
    if user:
        # 만료되었으면 자동 해제 처리
        if _is_locked(user):
            db.commit()
            logger.warning("잠금 상태 로그인 시도 user_id=%s", login_id)
            return None

    # 인증
    db_user = authenticate_user(db, login_id, form_data.password)
    if not db_user:
        # 존재하는 계정이면 실패 카운트 증가/잠금 처리
        if user:
            _on_login_fail(user)
            db.commit()
        logger.info("로그인 실패 user_id=%s", login_id)
        return None

    # 성공 처리
    _on_login_success(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    logger.info("로그인 성공 user_id=%s id=%s", db_user.user_id, db_user.id)
    return {"access_token": access_token, "token_type": "bearer"}
