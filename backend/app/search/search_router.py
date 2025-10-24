# app/search/search_router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Dict, Any
from app.core.database import get_db
from app.users.user_model import User
from app.profile.profile_model import Profile
from app.meta.skill_model import Skill
from app.profile.user_skill_model import UserSkill
from app.project_post.recipe_model import RecipePost, RecipePostSkill
from app.board.board_model import BoardPost

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/")
def global_search(
    q: str = Query(..., min_length=1, description="검색어"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    통합 검색 API
    - 유저 (닉네임, 보유 기술)
    - 프로젝트/스터디 (제목, 설명, 기술스택) - 프로젝트 종료된 것 제외, 모집중+모집완료 모두 포함
    - 게시판 글 (제목, 내용)
    """
    keyword = f"%{q}%"

    # ✅ 유저 검색
    user_results = (
    db.query(User, Profile)
    .join(Profile, Profile.id == User.id, isouter=True)
    .filter(
        and_(
            User.status == "ACTIVE",   # 🔥 정지/삭제된 계정 제외
            or_(
                User.nickname.like(keyword),
                User.id.in_(
                    db.query(UserSkill.user_id)
                    .join(Skill, Skill.id == UserSkill.skill_id)
                    .filter(Skill.name.like(keyword))
                )
            )
        )
    )
    .limit(10)
    .all()
)

    users = []
    for user, profile in user_results:
        user_skills = (
            db.query(Skill.id, Skill.name)
            .join(UserSkill, UserSkill.skill_id == Skill.id)
            .filter(UserSkill.user_id == user.id)
            .all()
        )
        
        users.append({
            "id": user.id,
            "nickname": user.nickname,
            "profile_image": profile.profile_image if profile else None,
            "headline": profile.headline if profile else None,
            "follower_count": profile.follower_count if profile else 0,
            "skills": [{"id": s.id, "name": s.name} for s in user_skills]
        })

    # ✅ 프로젝트/스터디 검색 (프로젝트 종료 제외 + 모집중/모집완료 모두 포함)
    project_results = (
    db.query(RecipePost)
    .filter(
        and_(
            RecipePost.project_status != "ENDED",             # 종료된 건 제외
            RecipePost.recruit_status.in_(["OPEN", "CLOSED"]),# 모집중 + 모집완료
            RecipePost.status == "APPROVED",                  # 🔥 승인된 글만
            RecipePost.deleted_at.is_(None),                  # 삭제 제외
            or_(
                RecipePost.title.like(keyword),
                RecipePost.description.like(keyword),
                RecipePost.id.in_(
                    db.query(RecipePostSkill.post_id)
                    .join(Skill, Skill.id == RecipePostSkill.skill_id)
                    .filter(Skill.name.like(keyword))
                )
            )
        )
    )
    .limit(10)
    .all()
)
    projects = []
    for project in project_results:
        # 프로젝트 스킬 조회
        project_skills = (
            db.query(Skill.id, Skill.name)
            .join(RecipePostSkill, RecipePostSkill.skill_id == Skill.id)
            .filter(RecipePostSkill.post_id == project.id)
            .all()
        )
        
        # ✅ 모집 상태 결정 (recruit_status 기준)
        if project.recruit_status == "OPEN":
            status = "모집중"
        elif project.recruit_status == "CLOSED":
            status = "모집완료"
        else:
            status = "모집종료"
        
        projects.append({
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "type": project.type,
            "leader_id": project.leader_id,
            "image_url": project.image_url,
            "status": status,  # ✅ 모집중/모집완료
            "skills": [{"id": s.id, "name": s.name} for s in project_skills]
        })

    # ✅ 게시판 검색
    boards = (
    db.query(BoardPost.id, BoardPost.title, BoardPost.content, BoardPost.category_id)
    .filter(
        and_(
            BoardPost.status == "VISIBLE",     # 🔥 숨김된 글 제외
            BoardPost.deleted_at.is_(None),    # 🔥 삭제된 글 제외
            or_(
                BoardPost.title.like(keyword),
                BoardPost.content.like(keyword)
            )
        )
    )
    .limit(10)
    .all()
)

    return {
        "users": users,
        "projects": projects,
        "boards": [dict(b._mapping) for b in boards],
    }