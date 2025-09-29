# app/meta/meta_service.py
from sqlalchemy.orm import Session
from app.meta.skill_model import Skill
from app.meta.application_field_model import ApplicationField

def get_skills(db: Session):
    return db.query(Skill).all()

def get_required_fields(db: Session):
    return db.query(ApplicationField).all()