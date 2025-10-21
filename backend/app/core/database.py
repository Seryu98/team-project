# app/core/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.core.base import Base

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

# ✅ 환경변수 검증
if not all([DB_USER, DB_PASSWORD, DB_NAME]):
    raise ValueError("필수 데이터베이스 환경변수가 설정되지 않았습니다 (DB_USER, DB_PASSWORD, DB_NAME)")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ 세션 핸들러 (요청 단위 DB 연결)
def get_db():
    """
    FastAPI 의존성 주입용 DB 세션 생성기
    - 요청이 정상적으로 끝나면 자동으로 commit()
    - 예외 발생 시 rollback() 후 세션 종료
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()   # ✅ 정상 요청 시 커밋
    except Exception:
        db.rollback()  # ✅ 예외 발생 시 롤백
        raise
    finally:
        db.close()     # ✅ 세션 종료
