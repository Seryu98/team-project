from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel

from app.core.database import get_db
from app.auth import auth_service
from app.auth.auth_schema import UserRegister
from app.core.security import verify_token
from app.users.user_model import User

router = APIRouter(prefix="/auth", tags=["auth"])

# 🚩 tokenUrl 앞에 / 제거 (중요!)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# === Request Schemas ===
class RefreshRequest(BaseModel):
    refresh_token: str


# === Routes ===

@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    """
    회원가입
    - 이메일/아이디/닉네임 중복 체크
    - 성공 시 user_id 반환
    """
    try:
        new_user = auth_service.register_user(db, user)
        return {"msg": "회원가입 성공", "user_id": new_user.user_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(),
          db: Session = Depends(get_db)):
    """
    로그인
    - username 필드에는 user_id를 넣어야 함
    - 성공 시 access_token(30분) + refresh_token(1일) 반환
    """
    tokens = auth_service.login_user(db, form_data)
    if not tokens:
        raise HTTPException(status_code=401, detail="로그인 실패")
    return tokens


@router.post("/refresh")
def refresh_token(req: RefreshRequest):
    """
    Refresh Token으로 새로운 Access Token 발급
    - 서버 재시작/버전 상승 시 기존 리프레시는 자동 무효
    """
    new_token = auth_service.refresh_access_token(req.refresh_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="리프레시 토큰이 유효하지 않습니다.")
    return new_token


@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme),
           db: Session = Depends(get_db)):
    """
    현재 로그인된 사용자 정보 반환
    - Access Token 필요
    """
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 사용자 ID가 없습니다.")

    user: User = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return {
        "id": user.id,
        "user_id": user.user_id,
        "email": user.email,
        "nickname": user.nickname,
        "role": getattr(user, "role", "user"),
    }