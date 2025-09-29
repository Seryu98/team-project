# app/meta/meta_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.meta import meta_service   # ✅ 경로 수정
from app.meta.meta_schema import SkillResponse, ApplicationFieldResponse

router = APIRouter(prefix="/meta", tags=["meta"])

@router.get("/skills", response_model=list[SkillResponse])
def get_skills(db: Session = Depends(get_db)):
    return meta_service.get_skills(db)

@router.get("/required-fields", response_model=list[ApplicationFieldResponse])
def get_required_fields(db: Session = Depends(get_db)):
    return meta_service.get_required_fields(db)