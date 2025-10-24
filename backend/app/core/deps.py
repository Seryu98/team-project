from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param  # ✅ 추가
from sqlalchemy.orm import Session
from datetime import datetime, timezone # 🩵 밴 만료 체크용
from typing import Optional
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


# 🩵 [수정됨] 선택적 로그인 허용용 의존성 (비로그인 시 401 완전 차단)
async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ✅ 로그인 여부가 선택적인 엔드포인트에서 사용
    - Authorization 헤더가 없으면 None 반환
    - 유효한 토큰이면 User 객체 반환
    - 잘못된 토큰이거나 만료된 경우에도 None 반환 (401 발생하지 않음)
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None  # 🔹 로그인하지 않은 경우 바로 통과

    scheme, token = get_authorization_scheme_param(auth_header)
    if not token or scheme.lower() != "bearer":
        return None

    try:
        payload = verify_token(token, expected_type="access")
        if not payload:
            return None
    except Exception:
        return None

    user_id: str = payload.get("sub")
    if not user_id:
        return None

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    return user
