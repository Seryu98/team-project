# app/core/email_verifier.py
import os
import time
import secrets
from typing import Dict, Tuple, Optional
from fastapi import HTTPException  # ✅ 추가
from .email_utils import send_email_smtp, is_valid_email_domain  # ✅ 도메인 검증 함수 import

# 메모리 저장소 (개발용). 배포 시 Redis/DB 권장
_store: Dict[str, Tuple[str, float, bool]] = {}
# value: (code, expire_ts, verified)

EXPIRE_MIN = int(os.getenv("EMAIL_CODE_EXPIRE_MINUTES", "5"))
SKIP = os.getenv("SKIP_EMAIL_VERIFICATION", "False") == "True"


def _now() -> float:
    return time.time()


def _gen_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def send_code(email: str) -> None:
    """인증 코드 생성+저장 후 메일(또는 콘솔) 발송"""
    try:
        # ✅ 이메일 도메인 유효성 검사 추가
        if not is_valid_email_domain(email):
            print(f"[email_verifier] 유효하지 않은 이메일 도메인: {email}")
            raise HTTPException(status_code=400, detail="존재하지 않는 이메일 도메인입니다.")

        code = _gen_code()
        expire = _now() + EXPIRE_MIN * 60
        _store[email.lower()] = (code, expire, False)

        # ✅ SMTP 메일 발송
        send_email_smtp(
            email,
            "회원가입 인증 코드",
            f"인증 코드는 {code} 입니다. 유효시간은 {EXPIRE_MIN}분입니다.",
        )
        print(f"[email_verifier] 인증 코드 발송 완료: {email} → {code}")

    except ValueError as e:
        # ✅ 이메일 전송 실패 (SMTP 오류 등)
        print(f"[email_verifier] 이메일 발송 실패: {email}, 오류: {e}")
        _store.pop(email.lower(), None)  # 실패 시 저장된 코드 제거
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # ✅ 예기치 못한 오류 처리
        print(f"[email_verifier] 이메일 발송 중 알 수 없는 오류: {email}, 오류: {e}")
        _store.pop(email.lower(), None)
        raise HTTPException(status_code=500, detail="이메일 발송 중 서버 오류가 발생했습니다.")


def verify_code(email: str, code: str) -> bool:
    """입력된 코드가 일치하고 유효한지 확인"""
    try:
        rec = _store.get(email.lower())
        if not rec:
            print(f"[email_verifier] 코드 없음: {email}")
            return False

        saved, expire, _ = rec

        # ✅ 만료 확인
        if _now() > expire:
            _store.pop(email.lower(), None)
            print(f"[email_verifier] 코드 만료됨: {email}")
            return False

        # ✅ 코드 불일치
        if saved != code:
            print(f"[email_verifier] 코드 불일치: {email}")
            return False

        # ✅ 인증 완료 처리
        _store[email.lower()] = (saved, expire, True)
        print(f"[email_verifier] 인증 성공: {email}")
        return True
    except Exception as e:
        print(f"[email_verifier] verify_code() 중 오류: {e}")
        return False


def is_verified(email: str) -> bool:
    """이메일이 인증 완료 상태인지 확인 (만료되면 False)"""
    if SKIP:
        return True

    try:
        rec = _store.get(email.lower())
        if not rec:
            print(f"[email_verifier] 인증 상태 없음: {email}")
            return False

        _, expire, ok = rec

        # ✅ 만료 시 자동 제거
        if _now() > expire:
            _store.pop(email.lower(), None)
            print(f"[email_verifier] 인증 만료됨: {email}")
            return False

        print(f"[email_verifier] 인증 상태 확인: {email} → {ok}")
        return ok
    except Exception as e:
        print(f"[email_verifier] is_verified() 중 오류: {e}")
        return False
