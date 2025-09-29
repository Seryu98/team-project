#routers/meta_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services import meta_service
from app.schemas.meta import SkillResponse, ApplicationFieldResponse   # ✅ 수정

router = APIRouter(prefix="/meta", tags=["meta"])

@router.get("/skills", response_model=list[SkillResponse])
def fetch_skills(db: Session = Depends(get_db)):
    return meta_service.get_skills(db)

@router.get("/required-fields", response_model=list[ApplicationFieldResponse])   # ✅ 수정
def fetch_required_fields(db: Session = Depends(get_db)):
    return meta_service.get_required_fields(db)
