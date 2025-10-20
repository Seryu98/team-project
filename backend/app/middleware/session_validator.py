# app/middleware/session_validator.py
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.database import get_db
from app.users.user_session_model import UserSession
from app.core.security import verify_token
from sqlalchemy.orm import Session

class SessionValidatorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # ✅ OPTIONS 프리플라이트 요청은 무조건 통과 (CORS 예비 요청)
        if request.method == "OPTIONS":
            return await call_next(request)

        # 인증이 필요 없는 경로는 통과
        if request.url.path.startswith((
            "/auth",
            "/docs",
            "/openapi",
            "/health",
            "/hot3",             # ✅ 메인 페이지 인기 게시물 캐시 API
            "/board",            # ✅ 게시판 관련
            "/project",          # ✅ 프로젝트/스터디 모집
            "/static",           # ✅ 정적 리소스
            "/assets",           # ✅ 프론트엔드 정적 파일
            "/uploads",          # ✅ 업로드 이미지 접근 경로
            "/stats",            # ✅ 통계/랭킹 관련 (CORS 차단 방지)
            "/recipe",           # ✅ 레시피 리스트 공개용 API
            "/posts",            # ✅ 게시물 리스트 공개용 API
        )):
            return await call_next(request)

        # JWT 토큰 추출
        token = request.headers.get("Authorization")
        if not token or not token.startswith("Bearer "):
            # ✅ 인증이 필요한 경로에서 토큰이 없으면 명확히 401 반환
            return JSONResponse(
                status_code=401,
                content={"detail": "인증 토큰이 없습니다. 로그인 후 이용해주세요."}
            )

        access_token = token.split(" ")[1]
        db: Session = next(get_db())

        try:
            # ✅ verify_token 사용 (decode_access_token 대체)
            payload = verify_token(access_token, expected_type="access")
            if not payload:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "유효하지 않은 토큰입니다."}
                )

            user_id = payload.get("sub")
            if not user_id:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "토큰에 사용자 정보가 없습니다."}
                )

            # ✅ 세션 DB에 존재하는지 확인
            session = db.query(UserSession).filter(
                UserSession.user_id == user_id,
                UserSession.token == access_token
            ).first()

            if not session:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "세션이 만료되었거나 유효하지 않습니다."}
                )

        except Exception:
            return JSONResponse(
                status_code=401,
                content={"detail": "토큰 검증 중 오류가 발생했습니다."}
            )

        # ✅ 모든 검증을 통과하면 요청 계속 진행
        return await call_next(request)
