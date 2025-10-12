# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
from typing import Optional
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
import requests
from urllib.parse import urlencode

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

# ===============================
# 정책 상수
# ===============================
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15
RESET_TOKEN_EXPIRE_MINUTES = 30  # 비밀번호 재설정 토큰 만료시간

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
    logger.info("회원가입 성공: id=%s email=%s", new_user.id, new_user.email)
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
        logger.warning("계정 잠금: user_id=%s until=%s", u.user_id, u.banned_until)


def _on_login_success(u: User) -> None:
    u.login_fail_count = 0
    u.account_locked = False
    u.banned_until = None
    u.last_login_at = datetime.utcnow()


# ===============================
# 사용자 인증
# ===============================
def authenticate_user(db: Session, user_id: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


# ===============================
# 로그인 처리 (Access + Refresh 발급)
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
# Refresh Token → 새 Access Token 발급
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
# 비밀번호 재설정 토큰 발급
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
# 비밀번호 재설정 실행
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
# ✅ 소셜 로그인 (2단계: 실제 구현)
# ===============================
def get_oauth_login_url(provider: str) -> str:
    redirect_uri = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:8000/auth/social/callback")

    if provider == "google":
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        params = {
            "client_id": client_id,
            "redirect_uri": f"{redirect_uri}/google",
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    elif provider == "naver":
        client_id = os.getenv("NAVER_CLIENT_ID")
        state = "naver_state"
        params = {
            "client_id": client_id,
            "redirect_uri": f"{redirect_uri}/naver",
            "response_type": "code",
            "state": state,
        }
        return f"https://nid.naver.com/oauth2.0/authorize?{urlencode(params)}"

    elif provider == "kakao":
        client_id = os.getenv("KAKAO_CLIENT_ID")
        params = {
            "client_id": client_id,
            "redirect_uri": f"{redirect_uri}/kakao",
            "response_type": "code",
        }
        return f"https://kauth.kakao.com/oauth/authorize?{urlencode(params)}"

    else:
        raise ValueError("지원하지 않는 provider입니다.")


def handle_oauth_callback(db: Session, provider: str, code: str) -> dict:
    redirect_uri = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:8000/auth/social/callback")

    if provider == "google":
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": f"{redirect_uri}/google",
        }
        token_res = requests.post(token_url, data=data)
        token_res.raise_for_status()
        access_token = token_res.json().get("access_token")

        user_info = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        ).json()
        email = user_info.get("email")
        name = user_info.get("name") or "Google 사용자"
        social_id = user_info.get("id")

    elif provider == "naver":
        token_url = "https://nid.naver.com/oauth2.0/token"
        data = {
            "client_id": os.getenv("NAVER_CLIENT_ID"),
            "client_secret": os.getenv("NAVER_CLIENT_SECRET"),
            "grant_type": "authorization_code",
            "code": code,
            "state": "naver_state",
        }
        token_res = requests.post(token_url, data=data)
        token_res.raise_for_status()
        access_token = token_res.json().get("access_token")

        user_info = requests.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        ).json()
        profile = user_info.get("response", {})
        email = profile.get("email")
        name = profile.get("name") or "Naver 사용자"
        social_id = profile.get("id")

    elif provider == "kakao":
        token_url = "https://kauth.kakao.com/oauth/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": os.getenv("KAKAO_CLIENT_ID"),
            "client_secret": os.getenv("KAKAO_CLIENT_SECRET", ""),
            "redirect_uri": f"{redirect_uri}/kakao",
            "code": code,
        }
        token_res = requests.post(token_url, data=data)
        token_res.raise_for_status()
        access_token = token_res.json().get("access_token")

        user_info = requests.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
        ).json()
        kakao_account = user_info.get("kakao_account", {})
        email = kakao_account.get("email")
        name = kakao_account.get("profile", {}).get("nickname") or "Kakao 사용자"
        social_id = str(user_info.get("id"))

    else:
        raise ValueError("지원하지 않는 provider입니다.")

    # ✅ 유저 등록 or 기존 유저 조회
    user = db.query(User).filter(User.social_id == social_id, User.auth_provider == provider).first()

    if not user:
        user = User(
            email=email or f"{provider}_{social_id}@example.com",
            user_id=f"{provider}_{social_id}",
            name=name,
            nickname=name,
            auth_provider=provider,
            social_id=social_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # ✅ JWT 발급
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    logger.info(f"{provider.capitalize()} 로그인 성공: email={email}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
