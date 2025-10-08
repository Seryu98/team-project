# app/profile/skill_router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.profile.skill_schemas import SkillCreate, UserSkillCreate, SkillOut
from app.profile.skill_service import (
    search_skills,
    create_skill,
    add_user_skill,
    get_user_skills,
    update_user_skill_level,
    remove_user_skill,
)
from app.users.user_model import User

router = APIRouter(prefix="/skills", tags=["skills"])

@router.get("/search", response_model=List[SkillOut])
def search_skill_endpoint(
    q: Optional[str] = Query("", description="부분 검색어"),
    limit: int = Query(10, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return search_skills(db, q, limit)


@router.post("/", response_model=SkillOut)
def register_skill(skill: SkillCreate, db: Session = Depends(get_db)):
    skill_obj = create_skill(db, skill.name)
    return {"id": skill_obj.id, "name": skill_obj.name, "level": None, "icon": f"/assets/skills/{skill_obj.name.lower()}.png"}


@router.get("/me", response_model=List[SkillOut])
def get_my_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_skills(db, current_user.id)


@router.post("/me", response_model=SkillOut)
def add_skill_to_me(
    skill_data: UserSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_user_skill(db, current_user.id, skill_data.skill_id, skill_data.level)


@router.put("/me/{skill_id}", response_model=SkillOut)
def update_my_skill_level(
    skill_id: int,
    skill_data: UserSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_user_skill_level(db, current_user.id, skill_id, skill_data.level)


@router.delete("/me/{skill_id}")
def delete_my_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return remove_user_skill(db, current_user.id, skill_id)