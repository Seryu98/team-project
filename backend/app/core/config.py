# app/core/config.py
import os
from datetime import timedelta
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# ===============================
# ✅ 기본 설정
# ===============================
PROJECT_NAME = "team-project"
API_PREFIX = "/api"

# ===============================
# ✅ 환경 변수 로드
# ===============================
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:1234@localhost:3306/team_project")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# ===============================
# ✅ JWT 설정
# ===============================
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))  # 24시간
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))  # 7일

ACCESS_TOKEN_EXPIRE = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_TOKEN_EXPIRE = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

# ===============================
# ✅ 단일 로그인 관련 설정
# ===============================
MAX_SESSIONS_PER_USER = 1  # 동시에 유지 가능한 세션 수 (1 = 단일 로그인)
SESSION_CLEANUP_INTERVAL = 60 * 10  # 10분마다 세션 정리 (초 단위)

# ===============================
# ✅ CORS 설정
# ===============================
BACKEND_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# ===============================
# ✅ 기타 설정
# ===============================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
