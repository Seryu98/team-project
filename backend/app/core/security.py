# app/core/security.py
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

# JWT 관련 기본 설정
SECRET_KEY = "temporary_secret"  # 실제 배포 시 환경변수로 교체 필요
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# 비밀번호 해싱/검증을 위한 bcrypt 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    # 비밀번호를 해시 처리
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    # 입력한 비밀번호와 저장된 해시 비교
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None):
    # JWT 토큰 생성
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})  # 만료 시간 추가
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)