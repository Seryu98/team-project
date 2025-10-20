# app/main.py
import os
from dotenv import load_dotenv
load_dotenv()
print("✅ .env 테스트:", os.getenv("GOOGLE_CLIENT_ID"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.notifications.notification_router import router as notification_router
from app.messages.message_router import router as message_router
from app.board.hot3_scheduler import start_scheduler   # ✅ team-project 기능
from app.search import search_router                   # ✅ soldesk 기능
from app.stats import stats_router                     # ✅ soldesk 기능

import os
import traceback
import logging
from pathlib import Path
from logging.handlers import RotatingFileHandler


# ===================================
# 📁 경로 설정 (team-project 기준)
# ===================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ASSETS_DIR = BASE_DIR / "frontend" / "src" / "shared" / "assets"
UPLOADS_DIR = BASE_DIR / "backend" / "uploads"

# ===================================
# 📜 로깅 설정
# ===================================
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
os.makedirs("logs", exist_ok=True)

file_handler = RotatingFileHandler(
    "logs/app.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"
)
file_handler.setLevel(LOG_LEVEL)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(file_handler)

# 세부 로그 레벨 튜닝(선택)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.INFO)

# ===================================
# 🚀 FastAPI 앱 생성
# ===================================
app = FastAPI(
    title="Team Project API",
    description="회원 관리, 프로필, 모집공고, 게시판 API, 소셜 로그인 API 서버",
    version="1.0.0",
)

# ✅ 서버 시작 시 스케줄러 실행
@app.on_event("startup")
def on_startup():
    start_scheduler()

# ===================================
# 🌐 CORS 설정 (필수)
# ===================================
origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================================
# ✅ 세션 검증 미들웨어 등록
# ===================================
from app.middleware.session_validator import SessionValidatorMiddleware
app.add_middleware(SessionValidatorMiddleware)
logging.info("✅ SessionValidatorMiddleware 활성화 완료")

# ===================================
# 🗂️ 정적 파일 마운트
# ===================================
# 업로드 파일
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# 프론트 assets (임시 프로필, 스킬, 별 아이콘 등)
if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")
    logging.info(f"✅ /assets 경로 연결 → {ASSETS_DIR}")
else:
    logging.warning(f"⚠️ assets 폴더를 찾을 수 없습니다: {ASSETS_DIR}")

# ===================================
# 📦 라우터 import 및 등록
# ===================================
from app.auth import auth_router, social_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router
from app.project_post import recipe_router
from app.meta import meta_router
from app.files import upload_router
from app.board import board_router
from app.users import user_router
from app.admin import admin_router
from app.report import report_router
from app.admin.admin_user_router import router as admin_user_router
from app.notifications import notification_ws_router  # ✅ [추가] 실시간 알림 WebSocket 라우터 import

# ✅ 모든 주요 라우터 등록
app.include_router(auth_router.router)
app.include_router(social_router.router)
app.include_router(db_test.router)
app.include_router(profile_router.router)
app.include_router(follow_router.router)
app.include_router(skill_router.router)
app.include_router(recipe_router.router)
app.include_router(meta_router.router)
app.include_router(upload_router.router)

# ✅ board router (public + 일반 둘 다)
if hasattr(board_router, "public_router"):
    app.include_router(board_router.public_router)
app.include_router(board_router.router)

app.include_router(user_router.router)
app.include_router(admin_router.router)
app.include_router(notification_router)
app.include_router(notification_ws_router.router)  # ✅ [추가] 실시간 알림 WebSocket 라우터 등록
app.include_router(message_router)
app.include_router(report_router.router)
app.include_router(admin_user_router)
app.include_router(stats_router.router)       # ✅ soldesk 기능
app.include_router(search_router.router)      # ✅ soldesk 기능


# ===================================
# 🏠 기본 라우트
# ===================================
@app.get("/")
def root():
    return {"message": "🚀 Team Project API is running!"}

logging.info("🚀 FastAPI 서버가 시작되었습니다.")

# ===================================
# 🌐 전역 예외 처리 미들웨어
# ===================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"\n🔥 [GLOBAL ERROR] 요청 경로: {request.url.path}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(e)}"},
        )

# ===================================
# ✅ 이메일 인증 관련 라우트 (보강용)
# ===================================
@app.get("/health")
def health_check():
    """✅ 서버 상태 확인용 (프론트엔드와 연동 테스트 시 사용)"""
    return {"status": "ok", "message": "FastAPI backend running normally"}
