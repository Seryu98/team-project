# app/users/user_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from app.users.user_model import User  # ✅ 클래스명 정확히 수정됨
from app.core.security import verify_password, get_password_hash
from app.auth.auth_service import get_current_user
from app.core.database import get_db
import re
import logging

router = APIRouter(
    prefix="/users/account",
    tags=["account"]
)

logger = logging.getLogger(__name__)


@router.post("/change-password", status_code=status.HTTP_200_OK)
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
