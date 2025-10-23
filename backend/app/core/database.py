# app/core/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.core.base import Base

# ======================================
# 🌱 환경 변수 로드
# ======================================
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

# ✅ 환경변수 검증
if not all([DB_USER, DB_PASSWORD, DB_NAME]):
    raise ValueError("필수 데이터베이스 환경변수가 설정되지 않았습니다 (DB_USER, DB_PASSWORD, DB_NAME)")

# ======================================
# 🧩 DB URL 생성
# ======================================
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ======================================
# ⚙️ SQLAlchemy 엔진 (풀 확장 버전)
# ======================================
engine = create_engine(
    DATABASE_URL,
    echo=False,          # 필요시 True로 변경하면 SQL 로그 출력
    future=True,
    pool_size=30,        # ✅ 기본 5 → 30으로 확장
    max_overflow=50,     # ✅ 임시 확장 가능 커넥션 수
    pool_timeout=30,     # ✅ 대기시간 초과 제한
    pool_recycle=1800,   # ✅ 30분마다 커넥션 재활용
    pool_pre_ping=True,  # ✅ 끊긴 커넥션 자동 감지 및 복구
)

# ======================================
# 🧠 세션 설정
# ======================================
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ======================================
# 🧹 DB 세션 의존성
# ======================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
