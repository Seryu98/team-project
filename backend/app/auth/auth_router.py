# app/auth/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import datetime
import re
import dns.resolver  # ✅ 추가
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse  # ✅ 리다이렉트 응답 추가

from app.core.database import get_db
from app.auth import auth_service
from app.auth.auth_schema import UserRegister
from app.core.security import (
    verify_token,
    hash_password,
    create_access_token,
    create_refresh_token,  # ✅ 토큰 생성 함수 추가
)
from app.users.user_model import User, UserStatus

# ✅ 추가: 이메일 인증 모듈
from app.core.email_verifier import (
    is_verified as is_email_verified,
    send_code,
    verify_code,
)

# ✅ 추가: 세션 모델
from app.users.user_session_model import UserSession

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
    except (
        IndexError,
        dns.resolver.NoAnswer,
        dns.resolver.NXDOMAIN,
        dns.resolver.NoNameservers,
        dns.resolver.LifetimeTimeout,
    ):
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
    existing_user = (
        db.query(User)
        .filter(User.user_id == user_id, User.status == UserStatus.ACTIVE)
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
    return {"message": "사용 가능한 아이디입니다."}


# ===============================
# ✅ 전화번호 중복 확인
# ===============================
@router.get("/check-phone")
def check_phone(
    phone_number: str = Query(..., description="중복 확인할 전화번호"),
    db: Session = Depends(get_db),
):
    """📞 전화번호 중복 확인 + 형식 검증 + 공백/기호 정리"""
    cleaned_number = re.sub(r"\D", "", phone_number.strip())

    # ✅ 형식 검증
    if not re.match(r"^01[0-9]{8,9}$", cleaned_number):
        return {
            "available": False,
            "message": "유효하지 않은 전화번호 형식입니다. 예: 01012345678",
        }

    # ✅ DB 저장 시 문자열 내 공백 제거 비교
    existing_user = (
        db.query(User)
        .filter(
            func.replace(func.replace(User.phone_number, '-', ''), ' ', '') == cleaned_number,
            User.status == UserStatus.ACTIVE,
        )
        .first()
    )

    if existing_user:
        return {"available": False, "message": "이미 등록된 전화번호입니다."}

    return {"available": True, "message": "사용 가능한 전화번호입니다."}


# ===============================
# ✅ 회원가입
# ===============================
@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    """🧩 일반 회원가입 (비밀번호 확인 + 중복 검증 + 이메일 형식 검사 + 인증 확인)"""
    try:
        if hasattr(user, "password_confirm") and user.password != user.password_confirm:
            raise ValueError("비밀번호가 일치하지 않습니다.")

        email_pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
        if not user.email or not re.match(email_pattern, user.email):
            raise ValueError("이메일 형식이 올바르지 않습니다.")

        if not is_valid_email_domain(user.email):
            raise ValueError("존재하지 않는 이메일 도메인입니다.")

        if not is_email_verified(user.email):
            raise ValueError("이메일 인증이 완료되지 않았습니다. 인증 코드를 확인해주세요.")

        if (
            db.query(User)
            .filter(User.email == user.email, User.status == UserStatus.ACTIVE)
            .first()
        ):
            raise ValueError("이미 등록된 이메일입니다.")

        if (
            db.query(User)
            .filter(User.user_id == user.user_id, User.status == UserStatus.ACTIVE)
            .first()
        ):
            raise ValueError("이미 사용 중인 아이디입니다.")

        if (
            db.query(User)
            .filter(User.nickname == user.nickname, User.status == UserStatus.ACTIVE)
            .first()
        ):
            raise ValueError("이미 사용 중인 닉네임입니다.")

        if user.phone_number:
            if (
                db.query(User)
                .filter(
                    User.phone_number == user.phone_number,
                    User.status == UserStatus.ACTIVE,
                )
                .first()
            ):
                raise ValueError("이미 등록된 전화번호입니다.")

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
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """🔐 일반 로그인 (auth_service.login_user 사용)"""
    try:
        # ✅ 기존 로그인 로직
        result = auth_service.login_user(db, form_data)
        if not result:
            raise HTTPException(
                status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다."
            )

        # ✅ result 안에 로그인된 user 정보가 포함되어 있어야 함
        user = result.get("user") if isinstance(result, dict) else None
        if user and hasattr(user, "id"):
            from app.notifications.notification_ws_manager import ws_manager
            from app.notifications.notification_service import send_notification
            from app.notifications.notification_model import (
                NotificationType,
                NotificationCategory,
            )

            # ✅ 이미 로그인된 다른 세션이 있을 경우 → WebSocket 알림 전송
            if ws_manager.is_user_connected(user.id):
                await ws_manager.send_personal_message(
                    user.id,
                    {
                        "type": "OTHER_DEVICE_LOGIN",
                        "message": "다른 기기에서 로그인되었습니다. 본인이 아닐 경우 비밀번호를 변경하세요.",
                    },
                )

                # ✅ 선택: DB에도 기록 남기기
                send_notification(
                    user_id=user.id,
                    type_=NotificationType.OTHER_DEVICE_LOGIN.value,
                    message="다른 기기에서 로그인되었습니다.",
                    category=NotificationCategory.SYSTEM.value,
                    db=db,
                )

        return result

    except HTTPException:
        raise
    except Exception as e:
        print("로그인 중 오류:", e)
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")


# ===============================
# ✅ 로그아웃 (세션 기반)
# ===============================
@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """🚪 로그아웃 (현재 세션 삭제 또는 관리자 전체 세션 종료)"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 사용자 ID가 없습니다.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # ✅ ADMIN의 경우 모든 세션 종료
    if getattr(user, "role", "").upper() == "ADMIN":
        db.query(UserSession).filter(UserSession.user_id == user.id).delete()
        db.commit()
        return {"msg": "관리자 계정의 모든 세션이 종료되었습니다."}

    # ✅ 일반 사용자 로그아웃
    deleted = (
        db.query(UserSession)
        .filter(UserSession.user_id == user.id, UserSession.token == token)
        .delete()
    )
    db.commit()

    if deleted:
        return {"msg": "로그아웃 완료"}
    else:
        raise HTTPException(status_code=400, detail="활성 세션이 존재하지 않습니다.")


@router.post("/refresh")
def refresh_token(req: RefreshRequest):
    """♻️ Refresh Token으로 Access Token 재발급"""
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

    # ✅ 세션 유효성 검증 추가
    if not auth_service.validate_session(db, token):
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다. 다시 로그인하세요.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="토큰에 사용자 ID가 없습니다.")

    user = db.query(User).filter(User.id == int(user_id)).first()
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
def update_me(
    req: UpdateUserRequest, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """✏️ 개인정보 수정 (닉네임/전화번호/비밀번호)"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    # ✅ 세션 유효성 검증 추가
    if not auth_service.validate_session(db, token):
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다. 다시 로그인하세요.")

    user_id = payload.get("sub")
    user = (
        db.query(User)
        .filter(User.id == int(user_id), User.status != UserStatus.DELETED)
        .first()
    )

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

    # ✅ 세션 유효성 검증 추가
    if not auth_service.validate_session(db, token):
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다. 다시 로그인하세요.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.status == UserStatus.DELETED:
        raise HTTPException(statuscode=400, detail="이미 탈퇴한 계정입니다.")

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
        raise HTTPException(statuscode=404, detail="등록된 정보가 없습니다.")
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
def social_callback(
    provider: str, code: str, request: Request, db: Session = Depends(get_db)
):
    """🔁 OAuth Callback 처리"""
    try:
        # 기존 서비스 로직 재사용 (토큰/신규여부 반환)
        tokens = auth_service.handle_oauth_callback(db, provider, code)
        # tokens 예시: {"access_token": "...", "refresh_token": "...", "new_user": True}

        # 프론트가 URL 파라미터에서 토큰을 읽는 구조이므로 리다이렉트로 전달
        # 기본 프론트 콜백 경로: /social/callback
        # 필요 시 환경변수나 설정을 쓰도록 auth_service에 이미 있으면 그걸 이용해도 됨
        return_json = request.query_params.get("return_json")
        if return_json and return_json.lower() in ("1", "true", "yes"):
            # 필요 시 JSON으로 직접 받는 사용성 유지
            return JSONResponse(tokens)

        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        is_new = str(bool(tokens.get("new_user", False))).lower()

        # 로컬 개발 기본값
        frontend_base = "http://localhost:5173"
        redirect_url = (
            f"{frontend_base}/social/callback?"
            f"access_token={access_token}&refresh_token={refresh_token}&new_user={is_new}"
        )
        return RedirectResponse(url=redirect_url)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 해당 이메일로 가입된 계정이 있습니다.")
    except Exception:
        raise HTTPException(status_code=500, detail="소셜 로그인 중 오류가 발생했습니다.")


# ===============================
# ✅ 튜토리얼 완료 처리
# ===============================
@router.patch("/tutorial-complete")
def complete_tutorial(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """튜토리얼 완료 처리"""
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    if not auth_service.validate_session(db, token):
        raise HTTPException(status_code=401, detail="세션이 만료되었습니다. 다시 로그인하세요.")

    user_id = payload.get("sub")
    user = (
        db.query(User)
        .filter(User.id == int(user_id), User.status == UserStatus.ACTIVE)
        .first()
    )

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
