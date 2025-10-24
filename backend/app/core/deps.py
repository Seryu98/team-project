from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
from jose import JWTError

from app.core.database import get_db
from app import models
from app.core.security import verify_token  # ✅ JWT 검증


# ------------------------------------------------------------------
# 🚩 로그인 강제 버전
# ------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # ✅ 토큰 검증
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise credentials_exception

    # 🩵 전역 밴 체크
    now = datetime.now(timezone.utc)
    if user.status == "BANNED":
        if user.banned_until and user.banned_until <= now:
            user.status = "ACTIVE"
            user.banned_until = None
            db.commit()
        else:
            raise HTTPException(status_code=403, detail="접근이 제한된 계정입니다.")
    elif user.banned_until and user.banned_until > now:
        user.status = "BANNED"
        db.commit()
        raise HTTPException(status_code=403, detail="접근이 제한된 계정입니다.")

    return user


# ------------------------------------------------------------------
# 🚩 로그인 선택 버전 (비로그인 허용)
# - Authorization 없거나 토큰이 잘못되면 None 반환
# - 유효하면 User 객체 반환
# ------------------------------------------------------------------
async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None  # 로그인 안 함

    scheme, token = get_authorization_scheme_param(auth_header)
    if not token or scheme.lower() != "bearer":
        return None

    try:
        payload = verify_token(token, expected_type="access")
        if not payload:
            return None
    except JWTError:
        return None
    except Exception:
        return None

    user_id: str = payload.get("sub")
    if not user_id:
        return None

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        return None

    # 🩵 밴 체크 (Optional에서는 그냥 None 반환)
    now = datetime.now(timezone.utc)
    if user.status == "BANNED" and (not user.banned_until or user.banned_until > now):
        return None

    return user
