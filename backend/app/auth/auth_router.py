# app/auth/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import datetime
import re
import dns.resolver  # ✅ 추가
from fastapi.responses import JSONResponse

from app.core.database import get_db
from app.auth import auth_service
from app.auth.auth_schema import UserRegister
from app.core.security import verify_token, hash_password
from app.users.user_model import User, UserStatus

# ✅ 추가: 이메일 인증 모듈
from app.core.email_verifier import is_verified as is_email_verified, send_code, verify_code
# ✅ 추가: WebSocket 매니저 (기존 기기 로그아웃 전송용)
from app.notifications.notification_ws_manager import ws_manager  # ✅ 추가됨

router = APIRouter(prefix="/auth", tags=["auth"])
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
    user_id: str


class PasswordResetRequest(BaseModel):
    user_id: str


class PasswordResetConfirm(BaseModel):
    reset_token: str
    new_password: str


class UpdateUserRequest(BaseModel):
    nickname: str | None = None
    phone_number: str | None = None
    password: str | None = None


# ===============================
# 🧩 공용 함수: 이메일 도메인 유효성 검사 (DNS MX)
# ===============================
def is_valid_email_domain(email: str) -> bool:
    """📧 입력된 이메일의 도메인 MX 레코드 존재 여부 확인"""
    try:
        domain = email.split("@")[1]
        dns.resolver.resolve(domain, "MX")
        return True
    except (IndexError, dns.resolver.NoAnswer, dns.resolver.NXDOMAIN,
            dns.resolver.NoNameservers, dns.resolver.LifetimeTimeout):
        return False
    except Exception:
        return False


# ===============================
# ✅ 이메일 유효성 검증 (DNS MX)
# ===============================
@router.get("/verify-email")
def verify_email(email: str = Query(..., description="확인할 이메일 주소")):
    """📧 실제 존재하는 이메일 도메인 검증 (DNS MX 조회 기반)"""
    if not is_valid_email_domain(email):
        return {"valid": False, "message": "존재하지 않는 이메일 주소입니다."}
    return {"valid": True, "message": "유효한 이메일 주소입니다."}


# ===============================
# ✅ 아이디 중복 확인
# ===============================
@router.get("/check-id")
def check_user_id(user_id: str, db: Session = Depends(get_db)):
    """🔎 아이디 중복 확인 API"""
    existing_user = db.query(User).filter(
        User.user_id == user_id,
        User.status == UserStatus.ACTIVE  # ✅ ACTIVE인 계정만 중복으로 판단
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
    return {"message": "사용 가능한 아이디입니다."}


# ===============================
# ✅ 전화번호 중복 확인
# ===============================
@router.get("/check-phone")
def check_phone(phone_number: str, db: Session = Depends(get_db)):
    """📱 전화번호 중복 확인 API"""
    existing_user = db.query(User).filter(
        User.phone_number == phone_number,
        User.status == UserStatus.ACTIVE
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 등록된 전화번호입니다.")
    return {"message": "사용 가능한 전화번호입니다."}


# ===============================
# ✅ 회원가입
# ===============================
@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    """🧩 일반 회원가입 (비밀번호 확인 + 중복 검증 + 이메일 형식 검사 + 인증 확인)"""
    try:
        # ✅ 비밀번호 확인
        if hasattr(user, "password_confirm") and user.password != user.password_confirm:
            raise ValueError("비밀번호가 일치하지 않습니다.")
        
        # ✅ 이메일 유효성 검사
        email_pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
        if not user.email or not re.match(email_pattern, user.email):
            raise ValueError("이메일 형식이 올바르지 않습니다.")

        # ✅ 실제 이메일 도메인 검증 (무료 DNS MX 기반)
        if not is_valid_email_domain(user.email):
            raise ValueError("존재하지 않는 이메일 도메인입니다.")

        # ✅ 이메일 인증 여부 확인 (email_verifier.py)
        if not is_email_verified(user.email):
            raise ValueError("이메일 인증이 완료되지 않았습니다. 인증 코드를 확인해주세요.")

        # # ✅ 이름 중복 확인 (추가해야 하는 부분!)
        # if db.query(User).filter(
        #     User.name == user.name,
        #     User.status == UserStatus.ACTIVE
        # ).first():
        #     raise ValueError("이미 등록된 이름입니다.")  # ← 여기서 fail to fetch 방지됨

        # ✅ 이메일 중복 확인 (ACTIVE 계정만)
        if db.query(User).filter(
            User.email == user.email,
            User.status == UserStatus.ACTIVE
        ).first():
            raise ValueError("이미 등록된 이메일입니다.")

        # ✅ 아이디 중복 확인 (ACTIVE 계정만)
        if db.query(User).filter(
            User.user_id == user.user_id,
            User.status == UserStatus.ACTIVE
        ).first():
            raise ValueError("이미 사용 중인 아이디입니다.")

        # ✅ 닉네임 중복 확인 (ACTIVE 계정만)
        if db.query(User).filter(
            User.nickname == user.nickname,
            User.status == UserStatus.ACTIVE
        ).first():
            raise ValueError("이미 사용 중인 닉네임입니다.")

        # ✅ 전화번호 중복 확인 (입력된 경우만, ACTIVE 계정만)
        if user.phone_number:
            if db.query(User).filter(
                User.phone_number == user.phone_number,
                User.status == UserStatus.ACTIVE
            ).first():
                raise ValueError("이미 등록된 전화번호입니다.")

        # ✅ 회원 등록
        new_user = auth_service.register_user(db, user)
        return {"msg": "회원가입 성공", "user_id": new_user.user_id}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


    except IntegrityError as e:
        db.rollback()
        err_msg = str(e.orig)
        if "user_id" in err_msg:
            raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
        elif "email" in err_msg:
            raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
        elif "nickname" in err_msg:
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
        elif "phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="이미 등록된 전화번호입니다.")
        else:
            raise HTTPException(status_code=400, detail="회원가입 중 중복된 정보가 있습니다.")

    except Exception as e:
        print("회원가입 중 예외 발생:", e)
        raise HTTPException(status_code=500, detail="회원가입 처리 중 서버 오류가 발생했습니다.")


# ===============================
# ✅ 로그인 / 토큰
# ===============================
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """🔐 일반 로그인 (Access + Refresh Token 발급)"""
    tokens = auth_service.login_user(db, form_data)
    if not tokens:
        raise HTTPException(status_code=401, detail="로그인 실패")

    # ✅ [추가됨] 중복 로그인 감지 시 응답 처리
    if isinstance(tokens, dict) and tokens.get("status") == "DUPLICATE_SESSION":
        return JSONResponse(
            status_code=200,
            content={
                "status": "DUPLICATE_SESSION",
                "message": tokens["message"]
            }
        )

    # ✅ [추가됨] 로그인 성공 시 기존 WebSocket 세션 종료 (단일 접속 유지)
    from app.notifications.notification_ws_manager import ws_manager  # 로컬 import (순환참조 방지)
    user = db.query(User).filter(User.user_id == form_data.username).first()
    if user:
        await ws_manager.force_logout_all(user.id)

    return tokens


# ✅ [🔧 수정됨] 강제 로그인 API (중복 로그인 모달 ‘확인’ 시 호출)
@router.post("/force-login")
async def force_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """⚠️ 강제 로그인 (기존 세션 무효화 후 새 세션 발급 + 기존 기기 WebSocket 로그아웃 전송)"""
    try:
        tokens = auth_service.force_login_user(db, form_data)  # ✅ auth_service에 구현된 강제 로그인 로직 호출
        if not tokens:
            raise HTTPException(status_code=401, detail="강제 로그인 실패")

        # ✅ 기존 로그인 중인 기기에 WebSocket 강제 로그아웃 메시지 전송
        user = db.query(User).filter(User.user_id == form_data.username).first()
        if user:
            await ws_manager.force_logout_all(user.id)

        return JSONResponse(
            status_code=200,
            content={
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "token_type": "bearer",
                "expires_in": tokens.get("expires_in", 3600),
                "status": "SUCCESS"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print("❌ 강제 로그인 중 예외 발생:", e)
        raise HTTPException(status_code=500, detail="강제 로그인 처리 중 서버 오류가 발생했습니다.")


@router.post("/refresh")
def refresh_token(req: RefreshRequest):
    """♻️ Refresh Token으로 Access Token 재발급"""
    payload = verify_token(req.refresh_token, expected_type="refresh")
    if not payload:
        raise HTTPException(status_code=401, detail="리프레시 토큰이 유효하지 않습니다.")

    new_token = auth_service.refresh_access_token(req.refresh_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="Access 토큰 재발급에 실패했습니다.")
    return new_token


# ===============================
# ✅ 내 정보 조회 / 수정
# ===============================
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
        "auth_provider": getattr(user, "auth_provider", "local"),
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


# ===============================
# ✅ 회원 탈퇴 (Soft Delete)
# ===============================
@router.delete("/delete-account")
def delete_account(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """💀 회원 탈퇴 (Soft Delete + 중복 방지용 필드 변경)"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.status == UserStatus.DELETED:
        raise HTTPException(status_code=400, detail="이미 탈퇴한 계정입니다.")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    user.email = f"{user.email}_deleted_{timestamp}"
    user.nickname = f"{user.nickname}_deleted_{timestamp}"
    if user.phone_number:
        user.phone_number = f"{user.phone_number}_deleted"

    user.status = UserStatus.DELETED
    user.deleted_at = datetime.utcnow()
    db.commit()
    return {"msg": "회원 탈퇴가 완료되었습니다."}


# ===============================
# ✅ 로그아웃 (서버 세션 무효화)
# ===============================
@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """🚪 로그아웃 (DB 세션 무효화 + 프론트 토큰 초기화용)"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 사용자 정보가 없습니다.")

    auth_service.logout_user(db, int(user_id))
    return {"msg": "로그아웃 완료"}


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
    user = db.query(User).filter(User.user_id == req.user_id).first()
    if not user or not user.email:
        raise HTTPException(status_code=404, detail="등록된 이메일이 없습니다.")

    email = user.email
    email_hint = auth_service.get_email_hint(db, req.user_id)
    return {"email_hint": email_hint, "email": email}


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
    """🔁 OAuth Callback 처리"""
    try:
        tokens = auth_service.handle_oauth_callback(db, provider, code)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 해당 이메일로 가입된 계정이 있습니다.")
    except Exception:
        raise HTTPException(status_code=500, detail="소셜 로그인 중 오류가 발생했습니다.")


@router.patch("/tutorial-complete")
def complete_tutorial(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """튜토리얼 완료 처리"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    user = db.query(User).filter(
        User.id == int(user_id),
        User.status == UserStatus.ACTIVE
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    user.is_tutorial_completed = True
    db.commit()
    return {"message": "튜토리얼 완료"}


# ===============================
# ✅ 이메일 인증 (회원가입/비밀번호 찾기 공통 API)
# ===============================
from pydantic import EmailStr
from typing import Literal

class EmailCodeRequest(BaseModel):
    email: EmailStr
    purpose: Literal["signup", "reset"]


@router.post("/email/send-code")
def send_verification_email(req: EmailCodeRequest):
    """📩 이메일 인증 코드 발송 (회원가입/비밀번호찾기 공통)"""
    try:
        send_code(req.email)
        return {"message": f"{req.purpose}용 인증 코드가 전송되었습니다."}
    except Exception as e:
        print("이메일 발송 오류:", e)
        raise HTTPException(status_code=500, detail="이메일 발송 중 오류가 발생했습니다.")


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: Literal["signup", "reset"]


@router.post("/email/verify-code")
def verify_email_code(req: VerifyCodeRequest):
    """✅ 이메일 인증 코드 검증 (회원가입/비밀번호찾기 공통)"""
    if verify_code(req.email, req.code):
        return {"verified": True, "message": "인증이 완료되었습니다."}
    raise HTTPException(status_code=400, detail="인증 코드가 유효하지 않거나 만료되었습니다.")
