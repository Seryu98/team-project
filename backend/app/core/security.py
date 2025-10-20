# app/core/security.py
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from typing import Optional
import os
import uuid  # 🚩 서버 재시작 시마다 UUID 변경

# === 환경설정 ===
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"

# 정책: Access 30분 + Refresh 1일
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 1

# 🚩 서버 재시작 시마다 새로운 UUID 발급 → 기존 토큰 무효화
SERVER_SESSION_VERSION = str(uuid.uuid4())

# bcrypt 암호화 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ===============================
# 🔐 비밀번호 해싱 및 검증
# ===============================
def get_password_hash(password: str) -> str:
    """비밀번호를 bcrypt로 해싱"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """입력한 비밀번호와 DB 해시 비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


# ✅ 기존 코드 호환용 (auth_service.py 등에서 hash_password를 사용하는 경우 대비)
hash_password = get_password_hash


# ===============================
# 🔑 JWT 토큰 생성/검증
# ===============================
def _create_token(data: dict, expires_delta: timedelta, token_type: str):
    """Access / Refresh / Reset 공용 토큰 생성"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({
        "exp": expire,
        "type": token_type,             # access / refresh / reset
        "ver": SERVER_SESSION_VERSION,  # 서버 버전
        "sub": str(data.get("sub"))     # 사용자 ID
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Access 토큰 생성"""
    return _create_token(
        data,
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access"
    )


def create_refresh_token(data: dict, expires_delta: timedelta | None = None):
    """Refresh 토큰 생성"""
    return _create_token(
        data,
        expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        token_type="refresh"
    )


def create_reset_token(data: dict, expires_delta: timedelta | None = None):
    """비밀번호 재설정용 토큰 생성"""
    return _create_token(
        data,
        expires_delta or timedelta(minutes=30),  # 기본 30분 유효
        token_type="reset"
    )


# ===============================
# ✅ 개선된 토큰 검증 로직
# ===============================
def verify_token(token: str, expected_type: Optional[str] = None):
    """JWT 토큰 검증 (Access / Refresh / Reset 구분 가능)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("[verify_token] ✅ payload:", payload)
    except ExpiredSignatureError:
        print("[verify_token] ❌ 만료된 토큰입니다.")
        return None
    except JWTError as e:
        print("[verify_token] ❌ JWTError:", repr(e))
        return None

    # 🚩 서버 재시작 시 무효화
    if payload.get("ver") != SERVER_SESSION_VERSION:
        print("[verify_token] ❌ version mismatch:", payload.get("ver"), "≠", SERVER_SESSION_VERSION)
        return None

    # 타입 검증
    if expected_type and payload.get("type") != expected_type:
        print("[verify_token] ❌ type mismatch:", payload.get("type"), "≠", expected_type)
        return None

    # 필수 키 검증
    if not payload.get("sub"):
        print("[verify_token] ❌ sub (user_id) 누락")
        return None

    return payload


# ============================================================
# 🧩 추가 기능: 세션 유효성 검증 로직 (validate_user_session)
# ============================================================
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app.users.user_session_model import UserSession
from app.core.database import get_db

def validate_user_session(db: Session, user_id: int, token: str):
    """
    ✅ 토큰-세션 매칭 검증
    - Access Token이 유효하더라도 DB에 해당 세션이 없거나 비활성화된 경우 → 401 반환
    """
    session = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.token == token,
        UserSession.is_active == True
    ).first()

    if not session:
        print(f"[validate_user_session] ❌ 세션 무효 또는 만료 user_id={user_id}")
        raise HTTPException(status_code=401, detail="Invalid session or logged out")

    print(f"[validate_user_session] ✅ 세션 유효 user_id={user_id}, token={token[:15]}...")
    return True
