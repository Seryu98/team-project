# app/admin/admin_router.py
# ✅ 관리자 라우터: 승인/거절, 신고 처리
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import Depends
from sqlalchemy import text
from app.core.database import get_db
from app.core.deps import get_current_user
from app.admin.admin_service import approve_post, reject_post, resolve_report

router = APIRouter(prefix="/admin", tags=["admin"])

def _ensure_admin(user):
    # 한 줄 요약 주석: 관리자 권한 확인
    if getattr(user, "role", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

@router.post("/posts/{post_id}/approve")
def api_approve_post(post_id: int, user=Depends(get_current_user)):
    _ensure_admin(user)
    return {"success": approve_post(post_id=post_id, admin_id=user.id)}

@router.post("/posts/{post_id}/reject")
def api_reject_post(post_id: int, reason: Optional[str] = None, user=Depends(get_current_user)):
    _ensure_admin(user)
    return {"success": reject_post(post_id=post_id, admin_id=user.id, reason=reason)}

@router.post("/reports/{report_id}/resolve")
def api_resolve_report(report_id: int, action: str = Query("RESOLVE"), reason: Optional[str] = None, user=Depends(get_current_user)):
    _ensure_admin(user)
    return {"success": resolve_report(report_id=report_id, admin_id=user.id, action=action, reason=reason)}

@router.get("/pending-posts")
def get_pending_posts(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    ✅ 승인 대기중인 게시글 목록 조회
    """
    _ensure_admin(user)
    rows = db.execute(text("""
    SELECT id, title, leader_id, status, created_at
    FROM posts
    WHERE status = 'PENDING'
    ORDER BY created_at DESC
    """)).fetchall()
    return {"data": [dict(r._mapping) for r in rows]}


@router.get("/pending-reports")
def get_pending_reports(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    ✅ 처리 대기중인 신고 목록 조회
    """
    _ensure_admin(user)
    rows = db.execute(text("""
    SELECT id, target_id, target_type, status, created_at
    FROM reports
    WHERE status = 'PENDING'
    ORDER BY created_at DESC
    """)).fetchall()
    return {"data": [dict(r._mapping) for r in rows]}