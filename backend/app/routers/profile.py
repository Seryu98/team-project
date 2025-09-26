from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db 
from app.schemas.profile import ProfileOut
from app.services.profile_service import get_profile_detail

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.get("/{user_id}", response_model=ProfileOut)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    return get_profile_detail(db, user_id)
