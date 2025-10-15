# app/admin/admin_router.py
# ✅ 관리자 라우터: 승인/거절, 신고 처리
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import Depends
from sqlalchemy import text
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.deps import get_current_user
from app.admin.admin_service import approve_post, reject_post, resolve_report

router = APIRouter(prefix="/admin", tags=["admin"])

def _ensure_admin(user):
    # 한 줄 요약 주석: 관리자 권한 확인
    if getattr(user, "role", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    
# ✅ 관리자 통계 조회 (대시보드)
@router.get("/stats")
def get_admin_stats(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    관리자 대시보드 통계 조회:
    - 승인 대기 게시글 수
    - 처리 대기 신고 수
    """
    _ensure_admin(user)

    stats = db.execute(text("""
        SELECT 
            (SELECT COUNT(*) FROM posts WHERE status = 'PENDING') AS pending_posts,
            (SELECT COUNT(*) FROM reports WHERE status = 'PENDING') AS pending_reports
    """)).mappings().first()

    return {
        "success": True,
        "data": dict(stats),
        "message": "관리자 통계 조회 성공"
    }

# ✅ 게시글 거절
@router.post("/posts/{post_id}/approve")
def api_approve_post(post_id: int, user=Depends(get_current_user)):
    _ensure_admin(user)
    return {"success": approve_post(post_id=post_id, admin_id=user.id)}

# ✅ 게시글 거절
@router.post("/posts/{post_id}/reject")
def api_reject_post(post_id: int, reason: Optional[str] = None, user=Depends(get_current_user)):
    _ensure_admin(user)
    return {"success": reject_post(post_id=post_id, admin_id=user.id, reason=reason)}

# ✅ 신고 처리 (승낙 / 거절)
class ReportResolveRequest(BaseModel):
    """
    신고 처리 요청 스키마
    - action: 'RESOLVE' 또는 'REJECT'
    - reason: 관리자가 작성한 사유 (선택)
    """
    action: str = Field(..., pattern="^(RESOLVE|REJECT)$", description="RESOLVE 또는 REJECT 중 하나")
    reason: Optional[str] = Field(None, description="관리자가 작성한 처리 사유")

@router.post("/reports/{report_id}/resolve")
def api_resolve_report(
    report_id: int,
    req: ReportResolveRequest,
    user=Depends(get_current_user)
):
    """
    ✅ 신고 처리 API
    - 관리자가 신고를 승인(RESOLVE)하거나 거절(REJECT)할 수 있음
    - action, reason은 요청 Body(JSON)로 받음
    - 내부적으로 resolve_report() 호출
    """
    _ensure_admin(user)
    ok = resolve_report(
        report_id=report_id,
        admin_id=user.id,
        action=req.action,
        reason=req.reason
    )

    return {
        "success": ok,
        "data": {
            "report_id": report_id,
            "action": req.action,
            "reason": req.reason or "(사유 없음)"
        },
        "message": "신고가 성공적으로 처리되었습니다."
    }

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
    ✅ 처리 대기중인 신고 목록 조회 (상세 정보 포함)
    """
    _ensure_admin(user)
    rows = db.execute(text("""
        SELECT 
            r.id,
            r.reporter_user_id,
            ru.nickname AS reporter_nickname,
            r.reported_user_id,
            tu.nickname AS reported_nickname,
            r.target_type,
            r.target_id,
            r.reason,
            r.status,
            r.created_at
        FROM reports r
        JOIN users ru ON ru.id = r.reporter_user_id
        JOIN users tu ON tu.id = r.reported_user_id
        WHERE r.status = 'PENDING'
        ORDER BY r.created_at DESC
    """)).fetchall()
    return {"success": True, "data": [dict(r._mapping) for r in rows]}
