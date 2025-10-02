from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from typing import Optional
import os
import uuid   # 🚩 추가: 서버 재시작 시마다 UUID 변경

# === 환경설정 ===
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"

# 정책: Access 30분 + Refresh 1일
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 1

# 🚩 서버 재시작 시마다 새로운 UUID 발급 → 기존 토큰 무효화
SERVER_SESSION_VERSION = str(uuid.uuid4())

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# === 비밀번호 해싱/검증 ===
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# === 토큰 생성 ===
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "type": "access",
        "ver": SERVER_SESSION_VERSION,   # 🚩 서버 버전 추가
        "sub": str(data.get("sub"))      # 사용자 ID
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode = data.copy()
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "ver": SERVER_SESSION_VERSION,   # 🚩 서버 버전 추가
        "sub": str(data.get("sub"))      # 사용자 ID
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# === 토큰 검증 ===
def verify_token(token: str, expected_type: Optional[str] = None):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("[verify_token] payload:", payload)  # ✅ 디버깅 로그
    except JWTError as e:
        print("[verify_token] ❌ JWTError:", repr(e))
        return None

    # 🚩 서버 재시작 시 무효화
    if payload.get("ver") != SERVER_SESSION_VERSION:
        print("[verify_token] ❌ version mismatch:", payload.get("ver"), "≠", SERVER_SESSION_VERSION)
        return None

    # 타입(access/refresh) 검증
    if expected_type and payload.get("type") != expected_type:
        print("[verify_token] ❌ type mismatch:", payload.get("type"), "≠", expected_type)
        return None

    return payload