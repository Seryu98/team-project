# app/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timezone # 🩵 밴 만료 체크용
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
    
    # 🩵  전역 밴 체크: banned_until 이 미래거나 status='BANNED' 이면 차단
    now = datetime.now(timezone.utc)
    if user.status == "BANNED":
        # 만료가 지남 + status만 BANNED인 경우 ACTIVE로 회복
        if user.banned_until and user.banned_until <= now:
            user.status = "ACTIVE"
            user.banned_until = None
            db.commit()
        else:
            raise HTTPException(status_code=403, detail="접근이 제한된 계정입니다.")
    elif user.banned_until and user.banned_until > now:
        # 아직 정지 기간이면 status 동기화
        user.status = "BANNED"
        db.commit()
        raise HTTPException(status_code=403, detail="접근이 제한된 계정입니다.")

    return user