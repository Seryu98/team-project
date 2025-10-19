# app/auth/social_router.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth import auth_service
import os

router = APIRouter(prefix="/auth/social", tags=["Social Login"])


@router.get("/login/{provider}")
def social_login(provider: str):
    """
    ✅ 소셜 로그인 진입점 (OAuth Authorization URL 생성)
    - provider: google | naver | kakao
    - 각 플랫폼의 로그인 페이지로 리다이렉트
    """
    try:
        provider = provider.lower()
        if provider not in ["google", "naver", "kakao"]:
            raise ValueError(
                "지원하지 않는 소셜 로그인입니다. (google/naver/kakao 중 하나)"
            )

        login_url = auth_service.get_oauth_login_url(provider)
        return RedirectResponse(login_url)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그인 URL 생성 실패: {str(e)}")


@router.get("/callback/{provider}")
def social_callback(
    provider: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    ✅ 소셜 로그인 콜백
    - provider: google | naver | kakao
    - 인증 코드(code)를 이용해 access_token 발급 및 사용자 정보 요청
    - 기존 회원이면 JWT 발급, 없으면 자동 회원가입 후 JWT 발급
    - 결과는 Redirect 또는 JSON 형식으로 반환
    """
    try:
        provider = provider.lower()
        if provider not in ["google", "naver", "kakao"]:
            raise ValueError(
                "지원하지 않는 소셜 로그인입니다. (google/naver/kakao 중 하나)"
            )

        # 🔹 쿼리 파라미터에서 code 추출
        code = request.query_params.get("code")
        if not code:
            raise HTTPException(
                status_code=400, detail="OAuth 인증 코드(code)가 누락되었습니다."
            )

        # 🔹 토큰 발급 및 사용자 정보 처리
        jwt_tokens = auth_service.handle_oauth_callback(db, provider, code)

        # 🔹 프론트엔드 URL (리다이렉트 또는 API 응답)
        frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
        redirect_url = (
            f"{frontend_origin}/social/callback?"
            f"access_token={jwt_tokens['access_token']}&"
            f"refresh_token={jwt_tokens['refresh_token']}"
        )

        # ✅ 리다이렉트 방식 (SPA 페이지 이동용)
        if os.getenv("SOCIAL_LOGIN_MODE", "redirect") == "redirect":
            return RedirectResponse(redirect_url)

        # ✅ JSON 응답 방식 (프론트가 직접 토큰 처리할 때)
        return JSONResponse(
            content={
                "msg": f"{provider.capitalize()} 로그인 성공",
                "access_token": jwt_tokens["access_token"],
                "refresh_token": jwt_tokens["refresh_token"],
                "token_type": "bearer",
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"소셜 로그인 처리 중 오류: {str(e)}"
        )
