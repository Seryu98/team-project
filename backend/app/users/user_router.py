from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timedelta
import re
import logging

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.auth.auth_service import get_current_user
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
logger = logging.getLogger(__name__)


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


@router.post("/account/change-password", status_code=status.HTTP_200_OK)
def change_password(
    current_password: str = Body(..., embed=True, description="현재 비밀번호"),
    new_password: str = Body(..., embed=True, description="새 비밀번호"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    🔐 비밀번호 변경 API
    ------------------
    ✅ 현재 비밀번호 검증
    ✅ 새 비밀번호 유효성 검사 (8~20자, 영문+숫자+특수문자)
    ✅ bcrypt 해시 적용 후 저장
    """

    # 사용자 조회
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        logger.warning(f"❌ 사용자 없음: ID={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )

    # 현재 비밀번호 확인
    # ⚠️ 주의: user_model.py에서는 password_hash 필드 사용 중
    if not verify_password(current_password, user.password_hash):
        logger.warning(f"❌ 비밀번호 불일치: user_id={user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 일치하지 않습니다."
        )

    # 새 비밀번호 유효성 검사
    password_pattern = r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+~{}:;<>?]).{8,20}$'
    if not re.match(password_pattern, new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다."
        )

    # 기존 비밀번호와 동일하지 않은지 확인
    if verify_password(new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호는 현재 비밀번호와 달라야 합니다."
        )

    # 비밀번호 변경 후 저장
    user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(user)

    logger.info(f"✅ 비밀번호 변경 성공: user_id={user.id}")
    return {"message": "비밀번호가 성공적으로 변경되었습니다."}