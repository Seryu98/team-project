# app/users/user_router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.users.user_schema import UserRankingResponse, SkillResponse
from app.users.user_model import User

# Profile, UserSkill, Skill import
try:
    from app.profile.profile_model import Profile, UserSkill, Skill
except ImportError:
    try:
        from app.models import Profile, UserSkill, Skill
    except ImportError:
        from app.profile import Profile, UserSkill, Skill

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/ranking", response_model=List[UserRankingResponse])
async def get_user_ranking(
    db: Session = Depends(get_db),
    sort: str = Query("followers", pattern="^(followers|recent)$"),
    skill_ids: Optional[List[int]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    유저 랭킹 조회
    - 3개월 이상 미접속 유저 제외
    - 팔로워순 or 최신순 정렬
    - 스킬 필터링 가능 (AND 조건)
    """
    # 3개월 전 날짜
    three_months_ago = datetime.utcnow() - timedelta(days=90)
    
    # 기본 쿼리
    query = (
        db.query(User)
        .join(Profile, Profile.id == User.id)
        .filter(
            User.deleted_at.is_(None),
            User.status == "ACTIVE",
            or_(
                User.last_login_at >= three_months_ago,
                User.last_login_at.is_(None)
            )
        )
    )
    
    # ✅ 스킬 필터링 (AND 조건으로 수정)
    # 선택한 모든 스킬을 가진 유저만 필터링
    if skill_ids and len(skill_ids) > 0:
        for skill_id in skill_ids:
            query = query.filter(
                User.id.in_(
                    db.query(UserSkill.user_id)
                    .filter(UserSkill.skill_id == skill_id)
                )
            )
    
    # 정렬
    if sort == "followers":
        query = query.order_by(Profile.follower_count.desc())
    else:
        query = query.order_by(User.created_at.desc())
    
    # 페이지네이션
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # DTO 변환
    result = []
    for user in users:
        profile = db.query(Profile).filter(Profile.id == user.id).first()
        
        # 스킬 조회
        skills = (
            db.query(Skill)
            .join(UserSkill, UserSkill.skill_id == Skill.id)
            .filter(UserSkill.user_id == user.id)
            .all()
        )
        
        result.append(UserRankingResponse(
            id=user.id,
            nickname=user.nickname,
            profile_image=profile.profile_image if profile else None,
            headline=profile.headline if profile else None,
            follower_count=profile.follower_count if profile else 0,
            following_count=profile.following_count if profile else 0,
            created_at=user.created_at,
            skills=[SkillResponse(id=s.id, name=s.name) for s in skills]
        ))
    
    return result