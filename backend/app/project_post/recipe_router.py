# app/project_post/recipe_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.project_post.recipe_schema import RecipePostCreate, RecipePostResponse
from app.project_post import recipe_service
from app.users.user_model import User   # ✅ users 도메인에서 가져오기

router = APIRouter(prefix="/recipe", tags=["recipe"])


@router.post("/", response_model=RecipePostResponse)
async def create_post(
    payload: RecipePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 권한 체크
    if current_user.role not in ["LEADER", "ADMIN", "MEMBER"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # 서비스 호출
    new_post = recipe_service.create_recipe_post(
        db=db,
        leader_id=current_user.id,
        **payload.dict()
    )
    return new_post