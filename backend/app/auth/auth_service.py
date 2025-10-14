# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
import os
import re
import secrets
import random
from urllib.parse import urlencode, quote_plus
from typing import Optional, Tuple

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.users.user_model import User, UserStatus
from app.auth.auth_schema import UserRegister
from app.profile.profile_model import Profile
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,  # 사용 안 하더라도 유지
)
from app.core.database import get_db

# ===============================
# ⚙️ 정책 상수
# ===============================
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15
RESET_TOKEN_EXPIRE_MINUTES = 30
HTTP_TIMEOUT = 8  # 외부 API 타임아웃(초)

logger = logging.getLogger(__name__)

# ===============================
# 🌐 공통 유틸
# ===============================
def _frontend_origin() -> str:
    """프론트엔드 오리진 (.env FRONTEND_ORIGIN)"""
    return os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")


def _oauth_base_redirect() -> str:
    """백엔드 콜백 루트 (.env OAUTH_REDIRECT_URI)"""
    return os.getenv(
        "OAUTH_REDIRECT_URI",
        "http://localhost:8000/auth/social/callback",
    ).rstrip("/")


def build_frontend_redirect_url(
    access_token: str, 
    refresh_token: str, 
    is_new_user: bool = False
) -> str:
    """프론트엔드로 토큰 전달용 URL 구성"""
    base = f"{_frontend_origin()}/social/callback"
    url = (
        f"{base}?access_token={quote_plus(access_token)}"
        f"&refresh_token={quote_plus(refresh_token)}"
    )
    
    # ✅ 신규 가입자면 new_user=true 추가
    if is_new_user:
        url += "&new_user=true"
    
    return url


def _safe_name(provider: str, default: Optional[str]) -> str:
    """제공된 이름이 없을 때 provider별 기본 이름"""
    if default and default.strip():
        return default.strip()
    return {
        "google": "Google 사용자",
        "naver": "Naver 사용자",
        "kakao": "Kakao 사용자",
    }.get(provider, "Social 사용자")


def _token_exchange(url: str, data: dict) -> dict:
    """OAuth 토큰 교환 (POST)"""
    try:
        res = requests.post(url, data=data, timeout=HTTP_TIMEOUT)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e:
        logger.exception("OAuth token exchange failed: %s", e)
        raise ValueError("토큰 교환 실패")


def _get_json(url: str, headers: dict) -> dict:
    """GET JSON 요청 공통 함수"""
    try:
        res = requests.get(url, headers=headers, timeout=HTTP_TIMEOUT)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e:
        logger.exception("OAuth userinfo request failed: %s", e)
        raise ValueError("사용자 정보 조회 실패")

# ===============================
# 🔐 비밀번호 유효성 검사
# ===============================
def validate_password(password: str) -> bool:
    """비밀번호: 영문, 숫자, 특수문자 포함 8~20자"""
    pattern = r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}$'
    return bool(re.match(pattern, password))


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ===============================
# 🔹 랜덤 닉네임 생성 (중복 방지)
# ===============================
def _generate_unique_nickname(db: Session, provider: str) -> str:
    """랜덤 닉네임 생성 (예: google_user_ab12cd)"""
    while True:
        nickname = f"{provider}_user_{secrets.token_hex(3)}"
        if not db.query(User).filter(User.nickname == nickname).first():
            return nickname

# ===============================
# 👇 소셜 사용자 등록 / 복귀 처리
# ===============================
def _upsert_social_user(
    db: Session,
    provider: str,
    social_id: str,
    email: Optional[str],
    name: Optional[str],
) -> Tuple[User, bool]:  # ✅ 반환 타입 변경
    """
    소셜 사용자 조회/생성/복귀 통합 처리
    반환: (User, is_new_user)
    """
    user = (
        db.query(User)
        .filter(User.social_id == social_id, User.auth_provider == provider)
        .first()
    )

    if user:
        # 탈퇴 복귀
        if user.status == UserStatus.DELETED:
            new_nickname = _generate_unique_nickname(db, provider)
            user.nickname = new_nickname
            user.status = UserStatus.ACTIVE
            user.deleted_at = None
            user.last_login_at = datetime.utcnow()
            if provider == "kakao":
                user.name = new_nickname
            db.commit()
            db.refresh(user)
            return user, False  # ✅ 복귀 유저는 신규 아님
        return user, False  # ✅ 기존 유저

    # 신규가입
    safe_email = email or f"{provider}_{social_id}@example.com"
    safe_user_id = f"{provider}_{social_id}"

    if provider in ["google", "naver"]:
        base_name = _safe_name(provider, name)
        nickname = _generate_unique_nickname(db, provider)
    elif provider == "kakao":
        nickname = _generate_unique_nickname(db, provider)
        base_name = nickname
    else:
        base_name = _safe_name(provider, name)
        nickname = _generate_unique_nickname(db, provider)

    user = User(
        email=safe_email,
        user_id=safe_user_id,
        name=base_name,
        nickname=nickname,
        auth_provider=provider,
        social_id=social_id,
        status=UserStatus.ACTIVE,
        is_tutorial_completed=False,  # ✅ 튜토리얼 미완료
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # ✅ Profile 자동 생성 추가
    new_profile = Profile(
        id=user.id,
        profile_image="/assets/profile/default_profile.png",
    )
    db.add(new_profile)
    db.commit()
    
    return user, True

# ===============================
# 🔑 JWT 발급
# ===============================
def _issue_jwt_pair(user_id: int) -> Tuple[str, str]:
    """JWT Access/Refresh Token 발급"""
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
    """신규 회원 등록"""
    if db.query(User).filter(User.email == user.email).first():
        raise ValueError("이미 존재하는 이메일입니다.")
    if db.query(User).filter(User.user_id == user.user_id).first():
        raise ValueError("이미 존재하는 아이디입니다.")
    if db.query(User).filter(User.nickname == user.nickname).first():
        raise ValueError("이미 존재하는 닉네임입니다.")

    if not validate_password(user.password):
        raise ValueError("비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.")

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

    # Profile 자동 생성
    new_profile = Profile(
        id=new_user.id,
        profile_image="/assets/profile/default_profile.png",
    )
    db.add(new_profile)
    db.commit()

    logger.info("회원가입 성공: id=%s email=%s", new_user.id, new_user.email)
    return new_user

# ===============================
# 🔒 계정 잠금 관련
# ===============================
def _is_locked(u: Optional[User]) -> bool:
    """계정 잠금 여부 확인"""
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


def _on_login_fail(u: Optional[User]) -> None:
    """로그인 실패 시 처리"""
    if not u:
        return
    u.login_fail_count = (u.login_fail_count or 0) + 1
    u.last_fail_time = datetime.utcnow()
    if u.login_fail_count >= MAX_LOGIN_FAILS:
        u.account_locked = True
        u.banned_until = datetime.utcnow() + timedelta(minutes=LOCK_TIME_MINUTES)
        logger.warning("계정 잠금: user_id=%s until=%s", u.user_id, u.banned_until)


def _on_login_success(u: User) -> None:
    """로그인 성공 시 초기화"""
    u.login_fail_count = 0
    u.account_locked = False
    u.banned_until = None
    u.last_login_at = datetime.utcnow()

# ===============================
# 👤 로그인 / 인증 / 토큰 재발급
# ===============================
def authenticate_user(db: Session, user_id: str, password: str) -> Optional[User]:
    """아이디+비밀번호 검증"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


def login_user(db: Session, form_data: OAuth2PasswordRequestForm) -> Optional[dict]:
    """일반 로그인"""
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


def refresh_access_token(refresh_token: str) -> Optional[dict]:
    """Refresh Token으로 Access Token 재발급"""
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
# 🌍 소셜 로그인 URL 발급 + Callback
# ===============================
def get_oauth_login_url(provider: str) -> str:
    """각 provider별 OAuth 로그인 URL 생성"""
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

    if provider == "naver":
        params = {
            "client_id": os.getenv("NAVER_CLIENT_ID"),
            "redirect_uri": f"{base_redirect}/naver",
            "response_type": "code",
            "state": "naver_state",
        }
        return f"https://nid.naver.com/oauth2.0/authorize?{urlencode(params)}"

    if provider == "kakao":
        params = {
            "client_id": os.getenv("KAKAO_CLIENT_ID"),
            "redirect_uri": f"{base_redirect}/kakao",
            "response_type": "code",
        }
        return f"https://kauth.kakao.com/oauth/authorize?{urlencode(params)}"

    raise ValueError("지원하지 않는 provider입니다.")


def handle_oauth_callback(db: Session, provider: str, code: str) -> RedirectResponse:
    """OAuth 인증 후 사용자 정보 조회 및 JWT 발급"""
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

    except Exception as e:
        logger.exception("소셜 로그인 오류(%s): %s", provider, e)
        raise ValueError("소셜 로그인 처리 실패")

    if not social_id:
        raise ValueError("소셜 사용자 ID를 확인할 수 없습니다.")

    # ✅ 사용자 등록/복귀 + 신규 가입자 여부 확인
    user, is_new_user = _upsert_social_user(db, provider, social_id, email, name)

    # JWT 발급 및 프론트로 리다이렉트
    access_token, refresh_token = _issue_jwt_pair(user.id)
    logger.info(
        "%s 로그인 성공: user_id=%s email=%s is_new=%s", 
        provider.capitalize(), user.id, user.email, is_new_user  # ✅ 로그에 신규 여부 추가
    )

    # ✅ 신규 가입자 정보 포함하여 리다이렉트
    redirect_url = build_frontend_redirect_url(access_token, refresh_token, is_new_user)
    return RedirectResponse(url=redirect_url)

# ===============================
# 🔹 현재 로그인된 사용자 조회 (JWT 기반)
# ===============================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
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

# ===============================
# 🔑 비밀번호 재설정 토큰 발급 (user_id 기준)
# ===============================
def generate_reset_token_by_user_id(db: Session, user_id: str) -> Optional[str]:
    """user_id로 비밀번호 재설정 토큰 생성"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or user.auth_provider != "LOCAL":
        return None

    reset_token = create_reset_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
    )
    logger.info("Reset token issued for user_id=%s", user_id)
    return reset_token

# ===============================
# ✉️ 이메일 힌트 및 인증번호 발송
# ===============================
def get_email_hint(db: Session, user_id: str) -> Optional[str]:
    """
    아이디(user_id)로 이메일 일부 힌트와 인증번호(6자리) 발송 처리
    - 실제 메일 전송 대신 콘솔(log)에 6자리 코드 출력
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="등록된 계정을 찾을 수 없습니다.")
    if not user.email:
        raise HTTPException(status_code=404, detail="등록된 이메일이 없습니다.")

    # 이메일 힌트 마스킹 (예: ex*****@g****.com)
    email = user.email
    at_index = email.find("@")
    if at_index > 2:
        email_hint = f"{email[:2]}*****@{email[at_index+1:at_index+2]}****.{email.split('.')[-1]}"
    else:
        email_hint = "****"

    # 6자리 인증번호 생성 (콘솔/로그 출력)
    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    logger.info("🔐 인증번호(미발송): %s (user_id=%s)", code, user_id)

    return email_hint

# ===============================
# 🔑 비밀번호 재설정 (Reset Token 기반)
# ===============================
def reset_password(db: Session, reset_token: str, new_password: str) -> bool:
    """
    Reset 토큰 검증 후 비밀번호 변경
    """
    payload = verify_token(reset_token, expected_type="reset")
    if not payload:
        logger.warning("reset_password: invalid token")
        return False

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("reset_password: no user_id in payload")
        return False

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        logger.warning("reset_password: user not found")
        return False

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expire = None
    db.commit()
    db.refresh(user)

    logger.info("비밀번호 재설정 성공: user_id=%s", user.user_id)
    return True
