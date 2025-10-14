# app/auth/auth_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import datetime
import re
from fastapi.responses import JSONResponse

from app.core.database import get_db
from app.auth import auth_service
from app.auth.auth_schema import UserRegister
from app.core.security import verify_token, hash_password
from app.users.user_model import User, UserStatus

router = APIRouter(prefix="/auth", tags=["auth"])

# 🚩 tokenUrl 앞에 "/" 제거 (FastAPI 권장 방식)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# ===============================
# 📦 Request Schemas
# ===============================
class RefreshRequest(BaseModel):
    refresh_token: str


class FindIdRequest(BaseModel):
    name: str
    phone_number: str


class EmailHintRequest(BaseModel):
    user_id: str  # ✅ 아이디로 이메일 힌트 요청


class PasswordResetRequest(BaseModel):
    user_id: str  # ✅ 이메일 대신 user_id 기준으로 요청


class PasswordResetConfirm(BaseModel):
    reset_token: str
    new_password: str


class UpdateUserRequest(BaseModel):
    nickname: str | None = None
    phone_number: str | None = None
    password: str | None = None


# ===============================
# ✅ 일반 회원 기능
# ===============================
@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    """🧩 일반 회원가입"""
    try:
        new_user = auth_service.register_user(db, user)
        return {"msg": "회원가입 성공", "user_id": new_user.user_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """🔐 일반 로그인 (Access + Refresh Token 발급)"""
    tokens = auth_service.login_user(db, form_data)
    if not tokens:
        raise HTTPException(status_code=401, detail="로그인 실패")
    return tokens


@router.post("/refresh")
def refresh_token(req: RefreshRequest):
    """♻️ Refresh Token으로 Access Token 재발급"""
    new_token = auth_service.refresh_access_token(req.refresh_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="리프레시 토큰이 유효하지 않습니다.")
    return new_token


@router.get("/me")
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """👤 현재 로그인된 사용자 정보 조회"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 사용자 ID가 없습니다.")

    user: User = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.status == UserStatus.DELETED:
        raise HTTPException(status_code=403, detail="탈퇴한 사용자입니다.")

    return {
        "id": user.id,
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "nickname": user.nickname,
        "phone_number": user.phone_number,
        "role": getattr(user, "role", "user"),
        "status": user.status,
    }


@router.patch("/me")
def update_me(req: UpdateUserRequest, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """✏️ 개인정보 수정 (닉네임/전화번호/비밀번호)"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    user = db.query(User).filter(
        User.id == int(user_id),
        User.status != UserStatus.DELETED
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if req.nickname:
        user.nickname = req.nickname
    if req.phone_number:
        user.phone_number = req.phone_number
    if req.password:
        user.password_hash = hash_password(req.password)

    db.commit()
    db.refresh(user)
    return {"msg": "개인정보가 수정되었습니다."}


@router.delete("/delete-account")
def delete_account(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """💀 회원 탈퇴 (Soft Delete)"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.status == UserStatus.DELETED:
        raise HTTPException(status_code=400, detail="이미 탈퇴한 계정입니다.")

    user.status = UserStatus.DELETED
    user.deleted_at = datetime.utcnow()
    db.commit()
    return {"msg": "회원 탈퇴가 완료되었습니다."}


# ===============================
# ✅ 아이디 / 비밀번호 찾기
# ===============================
@router.post("/find-id")
def find_id(req: FindIdRequest, db: Session = Depends(get_db)):
    """🔍 아이디 찾기 (이름 + 전화번호 일치 확인)"""
    input_name = req.name.strip()
    input_phone = re.sub(r"\D", "", req.phone_number)
    user = db.query(User).filter(User.name == input_name).first()
    if not user:
        raise HTTPException(status_code=404, detail="등록된 정보가 없습니다.")
    db_phone = re.sub(r"\D", "", user.phone_number or "")
    if input_phone != db_phone:
        raise HTTPException(status_code=404, detail="등록된 정보가 없습니다.")
    return {"user_id": user.user_id}


@router.post("/email-hint")
async def get_email_hint(req: EmailHintRequest, db: Session = Depends(get_db)):
    """✉️ 이메일 힌트 조회 (user_id 기준)"""
    email_hint = auth_service.get_email_hint(db, req.user_id)
    if not email_hint:
        raise HTTPException(status_code=404, detail="등록된 이메일이 없습니다.")
    return {"email_hint": email_hint}


@router.post("/request-password-reset")
def request_password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """🪄 비밀번호 재설정 토큰 발급 (user_id 기반)"""
    token = auth_service.generate_reset_token_by_user_id(db, req.user_id)
    if not token:
        raise HTTPException(status_code=400, detail="계정을 찾을 수 없거나 소셜 계정입니다.")
    return {"msg": "비밀번호 재설정 토큰 발급됨", "reset_token": token}


@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """🔑 비밀번호 재설정 완료"""
    success = auth_service.reset_password(db, req.reset_token, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="토큰이 유효하지 않거나 만료됨")
    return {"msg": "비밀번호가 성공적으로 변경되었습니다."}


# ===============================
# ✅ 소셜 로그인 (OAuth)
# ===============================
@router.get("/social/{provider}/login")
def social_login(provider: str):
    """🌍 소셜 로그인 URL 요청"""
    try:
        login_url = auth_service.get_oauth_login_url(provider)
        return {"login_url": login_url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/social/callback/{provider}")
def social_callback(provider: str, code: str, db: Session = Depends(get_db)):
    """
    🔁 OAuth Callback 처리
    - code → access_token 교환 → userinfo 조회
    - 기존/탈퇴 계정 처리 (auth_service._upsert_social_user 내부 로직)
    """
    try:
        tokens = auth_service.handle_oauth_callback(db, provider, code)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="소셜 로그인 중 오류가 발생했습니다.")
    
@router.patch("/tutorial-complete")
def complete_tutorial(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """튜토리얼 완료 처리"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    user.is_tutorial_completed = True
    db.commit()

    return {"message": "튜토리얼 완료"}
