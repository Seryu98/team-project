# app/auth/auth_service.py
from datetime import datetime, timedelta
import logging
import os
import re
import secrets
import random
import hashlib
from urllib.parse import urlencode, quote_plus
from typing import Optional, Tuple, Dict, Any, Callable

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
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.core.database import get_db

# ===============================
# ⚙️ 정책 상수
# ===============================
MAX_LOGIN_FAILS = 5
LOCK_TIME_MINUTES = 15
RESET_TOKEN_EXPIRE_MINUTES = 30
HTTP_TIMEOUT = 8

logger = logging.getLogger(__name__)

# ===============================
# [세션 관리 추가] user_sessions ORM 모델 정의
# ===============================
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    device_id = Column(String(100), nullable=False)
    token = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=func.now())


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


def build_frontend_redirect_url(
    access_token: str,
    refresh_token: str,
    is_new_user: bool = False,
) -> str:
    """프론트엔드로 토큰 전달용 URL 구성"""
    base = f"{_frontend_origin()}/social/callback"
    url = (
        f"{base}?access_token={quote_plus(access_token)}"
        f"&refresh_token={quote_plus(refresh_token)}"
    )
    if is_new_user:
        url += "&new_user=true"
    return url


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
# 🔐 비밀번호 유효성 검사
# ===============================
def validate_password(password: str) -> bool:
    pattern = r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}$"
    return bool(re.match(pattern, password))


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ===============================
# 🔹 랜덤 닉네임 생성
# ===============================
def _generate_unique_nickname(db: Session, provider: str) -> str:
    while True:
        nickname = f"{provider}_user_{secrets.token_hex(3)}"
        if not db.query(User).filter(User.nickname == nickname).first():
            return nickname


# ===============================
# 👇 소셜 사용자 등록 / 복귀
# ===============================
def _upsert_social_user(
    db: Session,
    provider: str,
    social_id: str,
    email: Optional[str],
    name: Optional[str],
) -> Tuple[User, bool]:
    """
    ✅ 소셜 사용자 조회/생성/복귀 통합 처리
    - Google/Naver → 실명 유지, 닉네임 새 랜덤
    - Kakao → 이름 = 닉네임 동일
    - 탈퇴 유저 복귀 시 → 새 닉네임 부여 + 상태 복구
    반환: (User, is_new_user)
    """
    user = (
        db.query(User)
        .filter(User.social_id == social_id, User.auth_provider == provider)
        .first()
    )

    # 🔁 기존 유저 존재 시
    if user:
        # 🔹 탈퇴된 유저 복귀 처리
        if user.status == UserStatus.DELETED:
            new_nickname = _generate_unique_nickname(db, provider)
            user.nickname = new_nickname
            user.status = UserStatus.ACTIVE
            user.deleted_at = None
            user.last_login_at = datetime.utcnow()

            # Kakao는 이름도 랜덤 닉네임으로 변경
            if provider == "kakao":
                user.name = new_nickname

            db.commit()
            db.refresh(user)
            return user, False  # 복귀 유저는 신규 아님

        # 이미 활성 유저면 그대로 반환
        return user, False

    # 🆕 신규가입 처리
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
        is_tutorial_completed=False,  # 튜토리얼 미완료
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Profile 자동 생성
    new_profile = Profile(
        id=user.id,
        profile_image="/assets/profile/default_profile.png",
    )
    db.add(new_profile)
    db.commit()

    return user, True  # 신규 가입자


# ===============================
# 🔑 JWT 발급
# ===============================
def _issue_jwt_pair(user_id: int) -> Tuple[str, str]:
    access_token = create_access_token(
        data={"sub": str(user_id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(data={"sub": str(user_id)})
    return access_token, refresh_token


# ===============================
# 🧩 회원가입 처리 (수정됨)
# ===============================
def register_user(db: Session, user: UserRegister) -> User:
    # ✅ ACTIVE 상태의 사용자만 중복으로 간주
    if (
        db.query(User)
        .filter(User.email == user.email, User.status == UserStatus.ACTIVE)
        .first()
    ):
        raise ValueError("이미 존재하는 이메일입니다.")
    if (
        db.query(User)
        .filter(User.user_id == user.user_id, User.status == UserStatus.ACTIVE)
        .first()
    ):
        raise ValueError("이미 존재하는 아이디입니다.")
    if (
        db.query(User)
        .filter(User.nickname == user.nickname, User.status == UserStatus.ACTIVE)
        .first()
    ):
        raise ValueError("이미 존재하는 닉네임입니다.")

    if not validate_password(user.password):
        raise ValueError("비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.")

    # ✅ 탈퇴 계정 복구 로직 추가
    existing_deleted = (
        db.query(User)
        .filter(User.user_id == user.user_id, User.status == UserStatus.DELETED)
        .first()
    )
    if existing_deleted:
        existing_deleted.email = user.email
        existing_deleted.password_hash = hash_password(user.password)
        existing_deleted.name = user.name
        existing_deleted.nickname = user.nickname
        existing_deleted.phone_number = user.phone_number
        existing_deleted.status = UserStatus.ACTIVE
        existing_deleted.deleted_at = None
        existing_deleted.is_tutorial_completed = False
        db.commit()
        db.refresh(existing_deleted)
        logger.info("🔄 탈퇴 계정 복구 완료: user_id=%s", user.user_id)
        return existing_deleted

    new_user = User(
        email=user.email,
        user_id=user.user_id,
        password_hash=hash_password(user.password),
        name=user.name,
        nickname=user.nickname,
        phone_number=user.phone_number,
        status=UserStatus.ACTIVE,  # ✅ 명시적으로 ACTIVE 설정
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_profile = Profile(
        id=new_user.id,
        profile_image="/assets/profile/default_profile.png",
    )
    db.add(new_profile)
    db.commit()

    logger.info("회원가입 성공: id=%s email=%s", new_user.id, new_user.email)
    return new_user


# ===============================
# 🔒 계정 잠금
# ===============================
def _is_locked(u: Optional[User]) -> bool:
    if not u:
        return False

    # 관리자 계정은 잠금 예외
    if u.role == "ADMIN":
        if u.account_locked or u.banned_until:
            u.account_locked = False
            u.login_fail_count = 0
            u.banned_until = None
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
    if not u:
        return

    # 관리자 계정은 잠금 제외 (로그만 기록)
    if u.role == "ADMIN":
        logger.warning("⚠️ 관리자 로그인 실패 감지: user_id=%s", u.user_id)
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


def authenticate_user(db: Session, user_id: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    if not user.password_hash or not verify_password(password, user.password_hash):
        return None
    return user


# ===============================
# 👤 로그인 / 인증 / 토큰 재발급
# ===============================
def login_user(db: Session, form_data: OAuth2PasswordRequestForm) -> Optional[dict]:
    login_id = form_data.username

    user = db.query(User).filter(User.user_id == login_id).first()

    # 🚫 탈퇴 계정 로그인 차단
    if user and user.status == UserStatus.DELETED:
        logger.warning("🚫 탈퇴 계정 로그인 시도 차단: user_id=%s", login_id)
        raise HTTPException(
            status_code=403, detail="탈퇴한 계정은 로그인할 수 없습니다."
        )

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

    # ===============================
    # [세션 관리 추가] user_sessions 기록
    # ===============================
    try:
        # device_id 생성 (프론트에서 전달되면 form_data.scopes[0]로 받는 것도 가능)
        raw_device = form_data.client_id if hasattr(form_data, "client_id") else None
        if not raw_device:
            raw_device = f"{form_data.username}-{random.randint(1000,9999)}"
        device_id = hashlib.sha256(raw_device.encode()).hexdigest()[:64]

        # 관리자(ROLE_ADMIN)는 단일 세션만 유지
        if db_user.role == "ADMIN":
            db.query(UserSession).filter(UserSession.user_id == db_user.id).delete()
            db.commit()

        # 기존 동일 디바이스 세션이 있으면 삭제 후 새로 추가
        db.query(UserSession).filter(
            UserSession.user_id == db_user.id,
            UserSession.device_id == device_id,
        ).delete()

        new_session = UserSession(
            user_id=db_user.id,
            device_id=device_id,
            token=access_token,
        )
        db.add(new_session)
        db.commit()
        logger.info("세션 등록 완료: user_id=%s device_id=%s", db_user.id, device_id)

    except Exception as e:
        logger.warning("⚠️ 세션 기록 실패: %s", e)
        db.rollback()

    # ===============================

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ===============================
# 🌍 소셜 로그인 URL 발급 + Callback
# ===============================


# 리다이렉트 URI 빌더(기존 동작 유지)
def _provider_redirect_uri(provider: str) -> str:
    return f"{_oauth_base_redirect()}/{provider}"


# 각 provider별 Auth URL/스코프만 선언(동작 동일, 표현만 일원화)
_AUTH_AUTHORIZE: Dict[str, Dict[str, Any]] = {
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "params": lambda: {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "redirect_uri": _provider_redirect_uri("google"),
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
        },
    },
    "naver": {
        "auth_url": "https://nid.naver.com/oauth2.0/authorize",
        "params": lambda: {
            "client_id": os.getenv("NAVER_CLIENT_ID"),
            "redirect_uri": _provider_redirect_uri("naver"),
            "response_type": "code",
            "state": "naver_state",
        },
    },
    "kakao": {
        "auth_url": "https://kauth.kakao.com/oauth/authorize",
        "params": lambda: {
            "client_id": os.getenv("KAKAO_CLIENT_ID"),
            "redirect_uri": _provider_redirect_uri("kakao"),
            "response_type": "code",
        },
    },
}

# 토큰/유저조회/파서 구성(중복 제거, 동작 동일)
_PROVIDER_CONFIG: Dict[str, Dict[str, Any]] = {
    "google": {
        "token_url": "https://oauth2.googleapis.com/token",
        "token_payload": lambda code: {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _provider_redirect_uri("google"),
        },
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "extract": lambda data: {
            "email": data.get("email"),
            "name": _safe_name("google", data.get("name")),
            "social_id": data.get("id"),
        },
        "missing_token_msg": "구글 액세스 토큰 없음",
    },
    "naver": {
        "token_url": "https://nid.naver.com/oauth2.0/token",
        "token_payload": lambda code: {
            "client_id": os.getenv("NAVER_CLIENT_ID"),
            "client_secret": os.getenv("NAVER_CLIENT_SECRET"),
            "grant_type": "authorization_code",
            "code": code,
            "state": "naver_state",
        },
        "userinfo_url": "https://openapi.naver.com/v1/nid/me",
        "extract": lambda data: (
            lambda profile: {
                "email": profile.get("email"),
                "name": _safe_name("naver", profile.get("name")),
                "social_id": profile.get("id"),
            }
        )((data.get("response") or {})),
        "missing_token_msg": "네이버 액세스 토큰 없음",
    },
    "kakao": {
        "token_url": "https://kauth.kakao.com/oauth/token",
        "token_payload": lambda code: {
            "grant_type": "authorization_code",
            "client_id": os.getenv("KAKAO_CLIENT_ID"),
            "client_secret": os.getenv("KAKAO_CLIENT_SECRET", ""),
            "redirect_uri": _provider_redirect_uri("kakao"),
            "code": code,
        },
        "userinfo_url": "https://kapi.kakao.com/v2/user/me",
        "extract": lambda data: (
            lambda acc: {
                "email": acc.get("email"),
                "name": _safe_name("kakao", (acc.get("profile") or {}).get("nickname")),
                "social_id": str(data.get("id")),
            }
        )((data.get("kakao_account") or {})),
        "missing_token_msg": "카카오 액세스 토큰 없음",
    },
}


def get_oauth_login_url(provider: str) -> str:
    base = _AUTH_AUTHORIZE.get(provider)
    if not base:
        raise ValueError("지원하지 않는 provider입니다.")
    return f"{base['auth_url']}?{urlencode(base['params']())}"


def handle_oauth_callback(db: Session, provider: str, code: str) -> RedirectResponse:
    base_redirect = _oauth_base_redirect()

    try:
        cfg = _PROVIDER_CONFIG.get(provider)
        if not cfg:
            raise ValueError("지원하지 않는 provider입니다.")

        # 토큰 교환
        token_json = _token_exchange(cfg["token_url"], cfg["token_payload"](code))
        access_token = token_json.get("access_token")
        if not access_token:
            raise ValueError(cfg["missing_token_msg"])

        # 유저 정보 조회
        user_info_raw = _get_json(
            cfg["userinfo_url"],
            headers={"Authorization": f"Bearer {access_token}"},
        )
        parsed = cfg["extract"](user_info_raw)
        email = parsed.get("email")
        name = parsed.get("name")
        social_id = parsed.get("social_id")

    except Exception as e:
        logger.exception("소셜 로그인 오류(%s): %s", provider, e)
        raise ValueError("소셜 로그인 처리 실패")

    if not social_id:
        raise ValueError("소셜 사용자 ID를 확인할 수 없습니다.")

    # 사용자 등록/복귀 + 신규 가입자 여부 확인
    user, is_new_user = _upsert_social_user(db, provider, social_id, email, name)

    # JWT 발급 및 프론트로 리다이렉트
    access_token, refresh_token = _issue_jwt_pair(user.id)
    logger.info(
        "%s 로그인 성공: user_id=%s email=%s is_new=%s",
        provider.capitalize(),
        user.id,
        user.email,
        is_new_user,
    )

    # ===============================
    # [세션 관리 추가] 소셜 로그인 세션 기록
    # ===============================
    try:
        device_id = hashlib.sha256(f"{provider}_{user.id}".encode()).hexdigest()[:64]

        # 관리자 단일 세션 정책
        if user.role == "ADMIN":
            db.query(UserSession).filter(UserSession.user_id == user.id).delete()
            db.commit()

        # 기존 동일 기기 세션 삭제
        db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.device_id == device_id,
        ).delete()

        new_session = UserSession(
            user_id=user.id,
            device_id=device_id,
            token=access_token,
        )
        db.add(new_session)
        db.commit()
        logger.info(
            "소셜 로그인 세션 등록 완료: user_id=%s provider=%s", user.id, provider
        )

    except Exception as e:
        logger.warning("⚠️ 소셜 로그인 세션 기록 실패: %s", e)
        db.rollback()

    redirect_url = build_frontend_redirect_url(access_token, refresh_token, is_new_user)
    return RedirectResponse(url=redirect_url)


# ===============================
# 🔹 현재 로그인된 사용자 조회 (JWT)
# ===============================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
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
# 🔑 비밀번호 재설정 토큰 발급
# ===============================
def generate_reset_token_by_user_id(db: Session, user_id: str) -> Optional[str]:
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
    EMAIL_MODE=dev → 콘솔 출력
    EMAIL_MODE=prod → 실제 Gmail SMTP 발송
    """
    logger.debug("email-hint called with user_id=%s", user_id)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        logger.warning("User not found: user_id=%s", user_id)
        raise HTTPException(status_code=404, detail="등록된 계정을 찾을 수 없습니다.")
    if not user.email:
        logger.warning("User email is None: user_id=%s", user_id)
        raise HTTPException(status_code=404, detail="등록된 이메일이 없습니다.")

    email = user.email
    at_index = email.find("@")
    email_hint = (
        f"{email[:2]}*****@{email[at_index+1:at_index+2]}****.{email.split('.')[-1]}"
        if at_index > 2
        else "****"
    )

    code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    logger.info("🔐 인증번호(테스트용 콘솔): %s (user_id=%s)", code, user_id)

    if os.getenv("EMAIL_MODE", "dev") == "prod":
        try:
            from smtplib import SMTP
            from email.mime.text import MIMEText

            smtp_user = os.getenv("EMAIL_USER")
            smtp_pass = os.getenv("EMAIL_PASS")
            smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
            smtp_port = int(os.getenv("SMTP_PORT", 587))

            msg = MIMEText(
                f"비밀번호 재설정을 위한 인증번호는 [{code}] 입니다.\n\n"
                f"요청하신 분이 본인이 아닐 경우 이 메일을 무시하셔도 됩니다."
            )
            msg["Subject"] = "🔐 비밀번호 재설정 인증번호"
            msg["From"] = smtp_user
            msg["To"] = user.email

            with SMTP(smtp_server, smtp_port) as smtp:
                smtp.starttls()
                smtp.login(smtp_user, smtp_pass)
                smtp.send_message(msg)
            logger.info("✅ 이메일 전송 완료 → %s", user.email)
        except Exception as e:
            logger.warning("⚠️ 이메일 전송 실패: %s", e)

    return email_hint


# ===============================
# 🔑 비밀번호 재설정 (Reset Token)
# ===============================
def reset_password(db: Session, reset_token: str, new_password: str) -> bool:
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
