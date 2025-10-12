# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
from typing import Optional, Tuple
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
import requests
from urllib.parse import urlencode, quote_plus

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
# ⚙️ 정책 상수
# ===============================
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15
RESET_TOKEN_EXPIRE_MINUTES = 30
HTTP_TIMEOUT = 8

logger = logging.getLogger(__name__)

# ===============================
# 🌐 공통 유틸
# ===============================

def _frontend_origin() -> str:
    return os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")


def _oauth_base_redirect() -> str:
    return os.getenv(
        "OAUTH_REDIRECT_URI",
        "http://localhost:8000/auth/social/callback",
    ).rstrip("/")


def build_frontend_redirect_url(access_token: str, refresh_token: str) -> str:
    base = f"{_frontend_origin()}/social/callback"
    return (
        f"{base}?access_token={quote_plus(access_token)}"
        f"&refresh_token={quote_plus(refresh_token)}"
    )


def _safe_name(provider: str, default: Optional[str]) -> str:
    if default and default.strip():
        return default.strip()
    return {
        "google": "Google 사용자",
        "naver": "Naver 사용자",
        "kakao": "Kakao 사용자",
    }.get(provider, "Social 사용자")


def _token_exchange(url: str, data: dict) -> dict:
    try:
        res = requests.post(url, data=data, timeout=HTTP_TIMEOUT)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e:
        logger.exception("OAuth token exchange failed: %s", e)
        raise ValueError("토큰 교환 실패")


def _get_json(url: str, headers: dict) -> dict:
    try:
        res = requests.get(url, headers=headers, timeout=HTTP_TIMEOUT)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e:
        logger.exception("OAuth userinfo request failed: %s", e)
        raise ValueError("사용자 정보 조회 실패")


# ===============================
# 👇 수정된 부분 (닉네임 중복 방지)
# ===============================
def _upsert_social_user(
    db: Session,
    provider: str,
    social_id: str,
    email: Optional[str],
    name: Optional[str],
) -> User:
    """소셜 사용자 조회/생성 통합 로직 (닉네임 중복 자동 처리)"""
    user = (
        db.query(User)
        .filter(User.social_id == social_id, User.auth_provider == provider)
        .first()
    )
    if user:
        return user

    # 기본 값 설정
    safe_email = email or f"{provider}_{social_id}@example.com"
    base_name = _safe_name(provider, name)
    safe_user_id = f"{provider}_{social_id}"

    # ✅ 닉네임 중복 방지 로직
    nickname = base_name
    suffix = 1
    while db.query(User).filter(User.nickname == nickname).first():
        nickname = f"{base_name}_{suffix}"
        suffix += 1

    user = User(
        email=safe_email,
        user_id=safe_user_id,
        name=base_name,
        nickname=nickname,
        auth_provider=provider,
        social_id=social_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _issue_jwt_pair(user_id: int) -> Tuple[str, str]:
    access_token = create_access_token(
        data={"sub": str(user_id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": str(user_id)})
    return access_token, refresh_token


# ===============================
# 🧩 회원가입 처리
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
# 🔒 계정 잠금 관련
# ===============================

def _is_locked(u: User) -> bool:
    if not u:
        return False
    now = datetime.utcnow()
    if u.account_locked and u.banned_until and u.banned_until > now:
        return True
    if u.account_locked and u.banned_until and u.banned_until <= now:
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
# 🔑 일반 로그인
# ===============================

def authenticate_user(db: Session, user_id: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


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

    access_token, refresh_token = _issue_jwt_pair(db_user.id)
    logger.info("로그인 성공: user_id=%s id=%s", db_user.user_id, db_user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ===============================
# 🔁 Refresh Token
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
# 🔐 비밀번호 재설정
# ===============================

def generate_reset_token(db: Session, email: str) -> Optional[str]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        logger.warning("비밀번호 재설정 실패: 존재하지 않는 이메일 %s", email)
        return None
    if not user.password_hash:
        logger.warning("비밀번호 재설정 실패: 소셜 계정 %s", email)
        return None

    reset_token = create_reset_token(data={"sub": str(user.id)})
    logger.info("비밀번호 재설정 토큰 발급: user_id=%s", user.user_id)
    return reset_token


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
# 🌍 ✅ 소셜 로그인
# ===============================

def get_oauth_login_url(provider: str) -> str:
    base_redirect = _oauth_base_redirect()

    if provider == "google":
        params = {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "redirect_uri": f"{base_redirect}/google",
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    elif provider == "naver":
        params = {
            "client_id": os.getenv("NAVER_CLIENT_ID"),
            "redirect_uri": f"{base_redirect}/naver",
            "response_type": "code",
            "state": "naver_state",
        }
        return f"https://nid.naver.com/oauth2.0/authorize?{urlencode(params)}"

    elif provider == "kakao":
        params = {
            "client_id": os.getenv("KAKAO_CLIENT_ID"),
            "redirect_uri": f"{base_redirect}/kakao",
            "response_type": "code",
        }
        return f"https://kauth.kakao.com/oauth/authorize?{urlencode(params)}"

    else:
        raise ValueError("지원하지 않는 provider입니다.")


def handle_oauth_callback(db: Session, provider: str, code: str) -> dict:
    base_redirect = _oauth_base_redirect()

    try:
        if provider == "google":
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{base_redirect}/google",
            }
            token_json = _token_exchange(token_url, data)
            access_token = token_json.get("access_token")
            if not access_token:
                raise ValueError("구글 액세스 토큰 없음")

            user_info = _get_json(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            email = user_info.get("email")
            name = _safe_name("google", user_info.get("name"))
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
            token_json = _token_exchange(token_url, data)
            access_token = token_json.get("access_token")
            if not access_token:
                raise ValueError("네이버 액세스 토큰 없음")

            user_info = _get_json(
                "https://openapi.naver.com/v1/nid/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile = user_info.get("response", {}) or {}
            email = profile.get("email")
            name = _safe_name("naver", profile.get("name"))
            social_id = profile.get("id")

        elif provider == "kakao":
            token_url = "https://kauth.kakao.com/oauth/token"
            data = {
                "grant_type": "authorization_code",
                "client_id": os.getenv("KAKAO_CLIENT_ID"),
                "client_secret": os.getenv("KAKAO_CLIENT_SECRET", ""),
                "redirect_uri": f"{base_redirect}/kakao",
                "code": code,
            }
            token_json = _token_exchange(token_url, data)
            access_token = token_json.get("access_token")
            if not access_token:
                raise ValueError("카카오 액세스 토큰 없음")

            user_info = _get_json(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            kakao_account = user_info.get("kakao_account", {}) or {}
            email = kakao_account.get("email")
            profile = kakao_account.get("profile", {}) or {}
            name = _safe_name("kakao", profile.get("nickname"))
            social_id = str(user_info.get("id"))

        else:
            raise ValueError("지원하지 않는 provider입니다.")

    except ValueError as e:
        logger.warning("소셜 로그인 처리 오류(%s): %s", provider, e)
        raise
    except Exception as e:
        logger.exception("소셜 로그인 처리 예기치 못한 오류(%s): %s", provider, e)
        raise ValueError("소셜 로그인 처리 중 오류")

    if not social_id:
        raise ValueError("소셜 사용자 ID를 확인할 수 없습니다.")

    # 사용자 upsert
    user = _upsert_social_user(db, provider, social_id, email, name)

    # JWT 발급
    access_token, refresh_token = _issue_jwt_pair(user.id)
    logger.info("%s 로그인 성공: user_id=%s email=%s", provider.capitalize(), user.id, user.email)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
