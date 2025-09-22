from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text   # ✅ 추가
from app.database import get_db

router = APIRouter()

@router.get("/api/db-test")
def db_test(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()   # ✅ text()로 감싸기
        return {"db_connection": "ok", "result": result}
    except Exception as e:
        return {"db_connection": "failed", "error": str(e)}