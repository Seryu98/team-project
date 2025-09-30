from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from typing import List
from app.profile.skill_model import Skill
from app.profile.user_skill_model import UserSkill

# ------------------------------------------
# 검색: 우리 DB에 등록된 스킬만 노출 (자동완성/검색용)
# ------------------------------------------
def search_skills(db: Session, q: str, limit: int = 10) -> List[dict]:
    query = db.query(Skill)
    if q:
        like = f"%{q}%"
        query = query.filter(Skill.name.ilike(like))  # ✅ 대소문자 무시, 특수문자도 그대로 처리
    skills = query.order_by(Skill.name.asc()).limit(limit).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "level": None,
            "icon": f"/assets/skills/{s.name.lower().replace('+', 'plus').replace('#', 'sharp')}.png"
        }
        for s in skills
    ]

# ------------------------------------------
# 스킬 등록 (초기 시드/관리자용) - 필요 시 사용
# ------------------------------------------
def create_skill(db: Session, name: str) -> Skill:
    exists = db.query(Skill).filter(func.lower(Skill.name) == name.lower()).first()
    if exists:
        raise HTTPException(status_code=400, detail="이미 존재하는 스킬입니다.")
    skill = Skill(name=name)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


# ------------------------------------------
# 내 보유 스킬: 등록 / 조회 / 수정 / 삭제
# ------------------------------------------
def add_user_skill(db: Session, user_id: int, skill_id: int, level: int):
    if level not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="숙련도는 1~3 사이여야 합니다.")

    # 스킬 존재 확인
    skill = db.query(Skill).get(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="해당 스킬이 존재하지 않습니다.")

    exists = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="이미 등록된 스킬입니다. 수정은 PUT을 사용하세요.")

    user_skill = UserSkill(user_id=user_id, skill_id=skill_id, level=level)
    db.add(user_skill)
    db.commit()
    db.refresh(user_skill)
    return {
        "id": skill.id,
        "name": skill.name,
        "level": user_skill.level,
        "icon": f"/assets/skills/{skill.name.lower()}.png",
    }


def get_user_skills(db: Session, user_id: int) -> List[dict]:
    user_skills = (
        db.query(UserSkill, Skill)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .order_by(Skill.name.asc())
        .all()
    )
    return [
        {
            "id": skill.id,
            "name": skill.name,
            "level": user_skill.level,
            "icon": f"/assets/skills/{skill.name.lower()}.png"
        }
        for user_skill, skill in user_skills
    ]


def update_user_skill_level(db: Session, user_id: int, skill_id: int, level: int):
    if level not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="숙련도는 1~3 사이여야 합니다.")

    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id
    ).first()
    if not user_skill:
        raise HTTPException(status_code=404, detail="해당 스킬이 내 보유 목록에 없습니다.")

    user_skill.level = level
    db.commit()

    # 이름/아이콘 포함 응답
    skill = db.query(Skill).get(skill_id)
    return {
        "id": skill.id,
        "name": skill.name,
        "level": user_skill.level,
        "icon": f"/assets/skills/{skill.name.lower()}.png",
    }


def remove_user_skill(db: Session, user_id: int, skill_id: int):
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id
    ).first()
    if not user_skill:
        raise HTTPException(status_code=404, detail="해당 스킬이 내 보유 목록에 없습니다.")

    db.delete(user_skill)
    db.commit()
    return {"success": True, "message": "스킬이 삭제되었습니다."}
