# app/services/meta_service.py
from sqlalchemy.orm import Session
from app.models.skill import Skill
from app.models.required_field import ApplicationField   # ✅

def get_skills(db: Session):
    return db.query(Skill).all()

def get_required_fields(db: Session):
    return db.query(ApplicationField).all()   # ✅