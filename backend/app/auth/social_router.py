# app/auth/social_router.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth import auth_service
import os

router = APIRouter(prefix="/auth/social", tags=["Social Login"])


@router.get("/login/{provider}")
def social_login(provider: str):
    """
    ✅ 소셜 로그인 진입점
    - provider: google | naver | kakao
    - 각 플랫폼의 인증 페이지로 리다이렉트
    """
    try:
        login_url = auth_service.get_oauth_login_url(provider)
        return RedirectResponse(login_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그인 URL 생성 실패: {str(e)}")


@router.get("/callback/{provider}")
def social_callback(provider: str, code: str, db: Session = Depends(get_db)):
    """
    ✅ 소셜 로그인 콜백
    - provider: google | naver | kakao
    - 인증 코드(code)를 이용해 access_token 발급 및 사용자 정보 요청
    - 해당 유저가 기존 회원이면 JWT 발급, 없으면 신규 등록 후 발급
    """
    try:
        jwt_tokens = auth_service.handle_oauth_callback(db, provider, code)

        # ✅ 프론트엔드 리다이렉트 URL 설정 (.env에서 FRONTEND_ORIGIN 가져오기)
        frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

        redirect_url = (
            f"{frontend_origin}/social/callback?"
            f"access_token={jwt_tokens['access_token']}&"
            f"refresh_token={jwt_tokens['refresh_token']}"
        )

        return RedirectResponse(redirect_url)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"소셜 로그인 처리 중 오류: {str(e)}")
