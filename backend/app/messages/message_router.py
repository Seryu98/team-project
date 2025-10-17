# app/messages/message_router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.messages.message_service import (
    list_inbox,
    list_sent,
    get_message,
    send_message,
    mark_read,
    send_message_by_nickname,
    list_admin_messages,
)
from app.messages.message_schema import MessageCreate
from app.messages.message_model import MessageCategory
from fastapi.responses import JSONResponse
from datetime import datetime

router = APIRouter(prefix="/messages", tags=["messages"])

# ---------------------------------------------------------------------
# ✅ 받은 메시지함 조회 (일반 / 관리자 쪽지 구분)
# ---------------------------------------------------------------------
@router.get("/")
def api_list_inbox(
    category: str = Query("NORMAL", description="쪽지 카테고리 (NORMAL | ADMIN | NOTICE)"),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    받은 메시지함 조회
    - 기본값: NORMAL (일반 쪽지)
    - ADMIN: 관리자 제재/신고 관련 쪽지
    - NOTICE: 공지사항 (운영팀 공지)
    """
    try:
        category_enum = MessageCategory(category.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 쪽지 카테고리입니다.")

    if category_enum == MessageCategory.ADMIN:
        items = list_admin_messages(user_id=user.id, limit=limit, db=db)
    else:
        items = list_inbox(user_id=user.id, limit=limit, db=db, category=category_enum.value)

    return {"success": True, "data": items, "message": "조회 성공"}


# ---------------------------------------------------------------------
# ✅ 보낸 메시지함 조회
# ---------------------------------------------------------------------
@router.get("/sent")
def api_list_sent(
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """보낸 메시지함 조회"""
    items = list_sent(user_id=user.id, limit=limit, db=db)
    return {"success": True, "data": items, "message": "조회 성공"}

# ---------------------------------------------------------------------
# ✅ 단일 메시지 조회
# ---------------------------------------------------------------------
@router.get("/{message_id}")
def api_get_message(
    message_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """단일 메시지 상세 조회"""
    m = get_message(user_id=user.id, message_id=message_id, db=db)
    if not m:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")

    # ✅ datetime → 문자열 변환 추가
    for k, v in m.items():
        if isinstance(v, datetime):
            m[k] = v.isoformat()  # 예: "2025-10-17T10:19:27"

    return JSONResponse(content={"success": True, "data": m, "message": "조회 성공"})

# ---------------------------------------------------------------------
# ✅ 메시지 전송 (닉네임 또는 ID 기반)
# ---------------------------------------------------------------------
@router.post("/")
def api_send_message(
    payload: MessageCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    쪽지 전송
    - receiver_nickname이 있으면 닉네임 기반
    - receiver_id가 있으면 ID 기반
    - category 기본값: NORMAL
    """
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="쪽지 내용을 입력해주세요.")

    # ✅ category 기본값 보정
    category = getattr(payload, "category", MessageCategory.NORMAL.value)
    if category.upper() not in [c.value for c in MessageCategory]:
        category = MessageCategory.NORMAL.value

    # ✅ 닉네임 기반 전송
    if getattr(payload, "receiver_nickname", None):
        mid = send_message_by_nickname(
            sender_id=user.id,
            receiver_nickname=payload.receiver_nickname.strip(),
            content=payload.content.strip(),
            db=db,
        )
        return {"success": True, "data": {"message_id": mid}, "message": "쪽지를 성공적으로 보냈습니다."}

    # ✅ ID 기반 전송
    if payload.receiver_id is None:
        raise HTTPException(status_code=400, detail="수신자 정보가 없습니다.")
    if payload.receiver_id == user.id:
        raise HTTPException(status_code=400, detail="자기 자신에게 쪽지를 보낼 수 없습니다.")

    mid = send_message(
        sender_id=user.id,
        receiver_id=payload.receiver_id,
        content=payload.content.strip(),
        db=db,
        category=category,
    )
    return {"success": True, "data": {"message_id": mid}, "message": "쪽지를 성공적으로 보냈습니다."}

# ---------------------------------------------------------------------
# ✅ 메시지 읽음 처리
# ---------------------------------------------------------------------
@router.post("/{message_id}/read")
def api_mark_read(
    message_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """메시지 읽음 처리"""
    ok = mark_read(user_id=user.id, message_id=message_id, db=db)
    if not ok:
        raise HTTPException(status_code=404, detail="해당 메시지를 찾을 수 없습니다.")
    return {"success": True, "message": "읽음 처리 완료"}
