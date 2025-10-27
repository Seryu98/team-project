# app/messages/message_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import User
from app.messages.message_model import MessageCategory
from app.messages.message_schema import MessageCreate
from app.messages.message_service import (
    list_inbox,
    list_sent,
    get_message,
    send_message,
    mark_read,
    send_message_by_nickname,
    list_admin_messages,
    send_admin_announcement,
)

router = APIRouter(prefix="/messages", tags=["messages"])


# ===========================
# 🗑️ 휴지통 관련 API (라우팅 순서 최상단으로 이동 ✅)
# ===========================

@router.get("/trash")
def list_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """휴지통 목록 조회"""
    rows = db.execute(
        text("""
            SELECT m.id, m.sender_id, m.receiver_id, m.category, m.content, m.created_at, mus.deleted_at
            FROM messages m
            JOIN message_user_status mus ON mus.message_id = m.id
            WHERE mus.user_id = :uid AND mus.is_deleted = 1
            ORDER BY mus.deleted_at DESC
        """),
        {"uid": current_user.id},
    ).mappings().all()

    return {
        "success": True,
        "data": [dict(r) for r in rows],
        "message": "휴지통 조회 성공",
    }


@router.post("/trash")
def move_to_trash(
    message_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """선택한 메시지를 휴지통으로 이동"""
    now = datetime.now(timezone.utc)
    for mid in message_ids:
        db.execute(
            text("""
                UPDATE message_user_status
                SET is_deleted = 1, deleted_at = :now
                WHERE message_id = :mid AND user_id = :uid
            """),
            {"mid": mid, "uid": current_user.id, "now": now},
        )
    db.commit()
    return {"success": True, "message": f"{len(message_ids)}개의 메시지가 휴지통으로 이동되었습니다."}


@router.post("/trash/restore")
def restore_from_trash(
    message_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """선택한 메시지를 휴지통에서 복원"""
    for mid in message_ids:
        db.execute(
            text("""
                UPDATE message_user_status
                SET is_deleted = 0, deleted_at = NULL
                WHERE message_id = :mid AND user_id = :uid
            """),
            {"mid": mid, "uid": current_user.id},
        )
    db.commit()
    return {"success": True, "message": f"{len(message_ids)}개의 메시지가 복원되었습니다."}


@router.delete("/trash/empty")
def empty_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """휴지통 비우기"""
    db.execute(
        text("DELETE FROM message_user_status WHERE user_id = :uid AND is_deleted = 1"),
        {"uid": current_user.id},
    )
    db.commit()
    return {"success": True, "message": "휴지통이 비워졌습니다."}


# ---------------------------------------------------------------------
# ✅ 받은 메시지함 조회 (일반 / 관리자 / 공지)
# ---------------------------------------------------------------------
@router.get("/")
def api_list_inbox(
    category: str = Query("NORMAL", description="쪽지 카테고리 (NORMAL | ADMIN | NOTICE)"),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """받은 메시지함 조회"""
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
    m = get_message(user_id=user.id, message_id=message_id, db=db)
    if not m:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")
    for k, v in m.items():
        if isinstance(v, datetime):
            m[k] = v.isoformat()
    return JSONResponse(content={"success": True, "data": m, "message": "조회 성공"})


# ---------------------------------------------------------------------
# ✅ 쪽지 전송
# ---------------------------------------------------------------------
@router.post("/")
def api_send_message(
    payload: MessageCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="쪽지 내용을 입력해주세요.")

    category = getattr(payload, "category", MessageCategory.NORMAL.value)
    if category.upper() not in [c.value for c in MessageCategory]:
        category = MessageCategory.NORMAL.value

    if getattr(payload, "receiver_nickname", None):
        mid = send_message_by_nickname(
            sender_id=user.id,
            receiver_nickname=payload.receiver_nickname.strip(),
            content=payload.content.strip(),
            db=db,
        )
        return {"success": True, "data": {"message_id": mid}, "message": "쪽지를 성공적으로 보냈습니다."}

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
    ok = mark_read(user_id=user.id, message_id=message_id, db=db)
    if not ok:
        raise HTTPException(status_code=404, detail="해당 메시지를 찾을 수 없습니다.")
    return {"success": True, "message": "읽음 처리 완료"}


# ---------------------------------------------------------------------
# ✅ 관리자 공지사항 발송
# ---------------------------------------------------------------------
@router.post("/admin/announcement")
def api_admin_announcement(
    title: str = Query(...),
    content: str = Query(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if getattr(user, "role", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    result = send_admin_announcement(admin_id=user.id, title=title, content=content, db=db)
    return {"success": True, "data": result, "message": "공지사항 전송 완료"}
