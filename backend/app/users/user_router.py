# app/users/user_router.py
from fastapi import APIRouter, Depends, Query, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from typing import Optional
from datetime import datetime, timedelta
import logging, re

from app.core.database import get_db
from app.users.user_schema import UserRankingResponse, UserRankingListResponse, SkillResponse
from app.users.user_model import User
from app.core.security import verify_password, get_password_hash
from app.auth.auth_service import get_current_user

# Profile, UserSkill, Skill import
try:
    from app.profile.profile_model import Profile, UserSkill, Skill
except ImportError:
    try:
        from app.models import Profile, UserSkill, Skill
    except ImportError:
        from app.profile import Profile, UserSkill, Skill

# 라우터 정의
router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)

# ===============================
# 👥 유저 랭킹 조회
# ===============================
@router.get("/ranking", response_model=UserRankingListResponse)
async def get_user_ranking(
    db: Session = Depends(get_db),
    sort: str = Query("score", pattern="^(score|followers|recent)$"),  # ✅ score 추가
    skill_ids: Optional[list[int]] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(21, ge=1, le=100),
    search: Optional[str] = Query(None, description="닉네임 검색어"),
):
    three_months_ago = datetime.utcnow() - timedelta(days=90)

    # ✅ score 정렬인 경우 raw SQL 사용
    if sort == "score":
        # 기본 쿼리
        sql = """
        SELECT 
            u.id,
            u.nickname,
            u.created_at,
            p.profile_image,
            p.headline,
            p.follower_count,
            p.following_count,
            COUNT(DISTINCT f.follower_id) AS followers,
            COUNT(DISTINCT po.id) AS project_posts,
            COUNT(DISTINCT b.id) AS board_posts,
            COUNT(DISTINCT bl.user_id) AS board_likes,
            (
              COUNT(DISTINCT f.follower_id) * 1 + 
              (COUNT(DISTINCT po.id) + COUNT(DISTINCT b.id)) * 2 + 
              COUNT(DISTINCT bl.user_id) * 3
            ) AS score
        FROM users u
        LEFT JOIN profiles p ON u.id = p.id
        LEFT JOIN follows f ON u.id = f.following_id
        LEFT JOIN posts po ON u.id = po.leader_id AND po.deleted_at IS NULL
        LEFT JOIN board_posts b ON u.id = b.author_id AND b.deleted_at IS NULL
        LEFT JOIN board_post_likes bl ON b.id = bl.board_post_id
        WHERE u.deleted_at IS NULL 
            AND u.status = 'ACTIVE'
            AND (u.last_login_at >= :three_months_ago OR u.last_login_at IS NULL)
        """

        params = {"three_months_ago": three_months_ago}

        # 검색어 추가
        if search:
            sql += " AND u.nickname LIKE :search"
            params["search"] = f"%{search}%"

        sql += " GROUP BY u.id, u.nickname, u.created_at, p.profile_image, p.headline, p.follower_count, p.following_count"

        # 스킬 필터 (별도 처리)
        if skill_ids:
            skill_user_ids = []
            for skill_id in skill_ids:
                user_ids_with_skill = db.query(UserSkill.user_id).filter(
                    UserSkill.skill_id == skill_id
                ).all()
                if not skill_user_ids:
                    skill_user_ids = set(uid[0] for uid in user_ids_with_skill)
                else:
                    skill_user_ids &= set(uid[0] for uid in user_ids_with_skill)
            
            if skill_user_ids:
                sql += f" HAVING u.id IN ({','.join(map(str, skill_user_ids))})"
            else:
                # 조건에 맞는 유저가 없으면 빈 결과 반환
                return {"users": [], "total_count": 0}

        # 전체 개수 쿼리
        count_sql = f"SELECT COUNT(*) FROM ({sql}) AS subquery"
        total_count = db.execute(text(count_sql), params).scalar()

        # 정렬 및 페이징
        sql += " ORDER BY score DESC LIMIT :limit OFFSET :offset"
        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        result = db.execute(text(sql), params).fetchall()

        users_list = []
        for row in result:
            # 스킬 조회
            skills = (
                db.query(Skill)
                .join(UserSkill, UserSkill.skill_id == Skill.id)
                .filter(UserSkill.user_id == row[0])
                .all()
            )
            
            users_list.append(UserRankingResponse(
                id=row[0],
                nickname=row[1],
                profile_image=row[3],
                headline=row[4],
                follower_count=row[5] or 0,
                following_count=row[6] or 0,
                created_at=row[2],
                score=row[11],  # ✅ score 필드 추가
                skills=[SkillResponse(id=s.id, name=s.name) for s in skills]
            ))

        return {"users": users_list, "total_count": total_count}

    # ✅ followers, recent 정렬 (기존 로직)
    else:
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

        if search:
            query = query.filter(User.nickname.ilike(f"%{search}%"))

        if skill_ids:
            for skill_id in skill_ids:
                query = query.filter(
                    User.id.in_(db.query(UserSkill.user_id).filter(UserSkill.skill_id == skill_id))
                )

        # 전체 개수
        total_count = query.count()

        # 정렬
        if sort == "followers":
            query = query.order_by(Profile.follower_count.desc())
        else:
            query = query.order_by(User.created_at.desc())

        users = query.offset((page - 1) * page_size).limit(page_size).all()

        result = []
        for user in users:
            profile = db.query(Profile).filter(Profile.id == user.id).first()
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
                score=None,  # ✅ followers/recent 정렬 시에는 score 없음
                skills=[SkillResponse(id=s.id, name=s.name) for s in skills]
            ))

        return {"users": result, "total_count": total_count}


# ===============================
# 🔐 비밀번호 변경 API
# ===============================
@router.post("/account/change-password", status_code=status.HTTP_200_OK)
def change_password(
    current_password: str = Body(..., embed=True, description="현재 비밀번호"),
    new_password: str = Body(..., embed=True, description="새 비밀번호"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    🔐 비밀번호 변경
    - 현재 비밀번호 검증
    - 새 비밀번호 유효성 검사 (8~20자, 영문+숫자+특수문자)
    - bcrypt 해시 적용 후 저장
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        logger.warning(f"❌ 사용자 없음: ID={current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다."
        )

    # 현재 비밀번호 확인
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

    # 비밀번호 변경
    user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(user)

    logger.info(f"✅ 비밀번호 변경 성공: user_id={user.id}")
    return {"message": "비밀번호가 성공적으로 변경되었습니다."}


# ===============================
# ✅ 현재 로그인 사용자 조회
# ===============================
@router.get("/me")
def get_my_info(current_user: User = Depends(get_current_user)):
    """
    현재 로그인한 사용자 정보를 반환합니다.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nickname": current_user.nickname,
        "role": current_user.role,
        "status": current_user.status,
    }