# app/auth/email_verification_router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import dns.resolver
from app.core.email_verifier import send_code, verify_code

router = APIRouter(prefix="/auth/email", tags=["Email Verification"])

class SendReq(BaseModel):
    email: EmailStr

class VerifyReq(BaseModel):
    email: EmailStr
    code: str

@router.post("/send-code")
def send_code_api(req: SendReq):
    """이메일 인증 코드 발송 (DNS MX 도메인 검증 포함)"""
    domain = req.email.split("@")[1]
    try:
        dns.resolver.resolve(domain, "MX")
    except Exception:
        raise HTTPException(status_code=400, detail="존재하지 않는 이메일 도메인입니다.")
    send_code(req.email)
    return {"msg": "인증 코드가 전송되었습니다."}

@router.post("/verify-code")
def verify_code_api(req: VerifyReq):
    """이메일 인증 코드 검증"""
    ok = verify_code(req.email, req.code.strip())
    if not ok:
        raise HTTPException(status_code=400, detail="인증 코드가 유효하지 않거나 만료되었습니다.")
    return {"msg": "이메일 인증이 완료되었습니다."}
