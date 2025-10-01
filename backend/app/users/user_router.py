# backend/app/users/user_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.users.user_model import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/by-nickname")
def get_user_by_nickname(nickname: str = Query(...), db: Session = Depends(get_db)):
    """
    닉네임으로 단일 사용자 조회 (닉네임 유니크 전제)
    """
    # ✅ 디버깅용 출력
    print(">>> 검색 요청 nickname =", repr(nickname))
    user = db.query(User).filter(User.nickname == nickname).first()

    # ✅ DB 결과도 출력
    print(">>> DB 조회 결과 =", user)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "nickname": user.nickname}
