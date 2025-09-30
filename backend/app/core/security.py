from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

# JWT 관련 기본 설정
SECRET_KEY = "temporary_secret"  # 실제 배포 시 환경변수로 교체 필요
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# 비밀번호 해싱/검증을 위한 bcrypt 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    비밀번호를 bcrypt 해시로 변환
    - bcrypt는 72바이트까지만 지원하므로 [:72]로 제한
    - 혹시 dict나 다른 타입이 들어오면 str()로 강제 변환
    """
    return pwd_context.hash(str(password)[:72])

def verify_password(plain: str, hashed: str) -> bool:
    """
    입력한 비밀번호와 저장된 해시 비교
    - plain도 str 변환 및 72바이트 제한
    """
    return pwd_context.verify(str(plain)[:72], hashed)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    JWT 토큰 생성
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Swagger Authorize 버튼과 연동되는 OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
