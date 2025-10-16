# app/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app import models
from app.core.security import verify_token  # ✅ verify_token 함수 사용

# 로그인된 유저만 접근 가능한 API에 사용하는 의존성
# 🚩 tokenUrl 앞에 / 제거
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # ✅ verify_token()으로 JWT 검증 통합
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise credentials_exception

    # 토큰에서 user_id(sub) 추출
    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    # 토큰에서 얻은 id로 DB 조회
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise credentials_exception

    return user
