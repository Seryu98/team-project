# app/admin/admin_router.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.deps import get_current_user
from app.admin.admin_schema import (
    ResolveUserCommentReportRequest,
    ResolvePostReportRequest,
)
from app.admin.admin_service import (
    approve_post,
    reject_post,
    resolve_report,
    get_admin_stats,
    list_banned_users,  
    ban_user,            
    unban_user,  
    resolve_user_comment_report,
    resolve_post_report,        
)

router = APIRouter(prefix="/admin", tags=["admin"])

# ✅ 관리자 권한 체크
def _ensure_admin(user):
    if getattr(user, "role", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")


# ✅ 관리자 대시보드 통계 조회
@router.get("/stats")
def api_get_admin_stats(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    관리자 대시보드 통계 조회
    - 승인 대기 게시글 수
    - 처리 대기 신고 수
    """
    _ensure_admin(user)
    stats = get_admin_stats(db)
    return {"success": True, "data": stats, "message": "관리자 통계 조회 성공"}


# ✅ 신고 대기 목록 조회 (관리자 신고 처리 페이지용)
@router.get("/pending-reports")
def api_get_pending_reports(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    처리 대기 중인 신고 목록 조회
    - 상태: PENDING
    """
    _ensure_admin(user)
    rows = db.execute(
        text("""
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
            LEFT JOIN users ru ON ru.id = r.reporter_user_id
            LEFT JOIN users tu ON tu.id = r.reported_user_id
            WHERE r.status = 'PENDING'
            ORDER BY r.created_at DESC
        """)
    ).mappings().all()

    return {
        "success": True,
        "data": [dict(r) for r in rows],
        "message": "신고 대기 목록 조회 성공",
    }

# ----------------------------
# ✅ 신고 처리 요청 스키마
# ----------------------------
class ReportAction(BaseModel):
    action: str = Field(..., description="RESOLVE 또는 REJECT")
    reason: Optional[str] = Field(None, description="처리 사유")
    penalty_type: Optional[str] = Field(
        None,
        description="제재 수위: WARNING, BAN_3DAYS, BAN_7DAYS, BAN_PERMANENT (RESOLVE일 때만 유효)",
    )

# ----------------------------
# ✅ 신고 처리 (승낙 / 거절)
# ----------------------------
@router.post("/reports/{report_id}/resolve")
def api_resolve_report(
    report_id: int,
    payload: ReportAction,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    관리자 신고 처리 엔드포인트
    - action: "RESOLVE" 또는 "REJECT"
    - reason: 처리 사유 (선택)
    - penalty_type: 제재 수위 (RESOLVE 시만)
    """
    _ensure_admin(user)
    try:
        ok = resolve_report(
            report_id=report_id,
            admin_id=user.id,
            action=payload.action,
            reason=payload.reason,
            penalty_type=payload.penalty_type,
            db=db,
        )
        if ok:
            return {"success": True, "message": "신고 처리 완료"}
        else:
            return {"success": False, "message": "신고 처리에 실패했습니다."}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"신고 처리 중 오류 발생: {e}")
    
# ----------------------------
# ✅ 댓글/유저 제재 처리
# ----------------------------
@router.post("/reports/{report_id}/resolve/user-comment")
def api_resolve_user_comment_report(
    report_id: int,
    body: ResolveUserCommentReportRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    [10/20 추가]
    댓글/유저 신고 처리용 API
    - comment_action: NONE/HIDE/DELETE
    - user_action: NONE/WARNING/BAN_3DAYS/BAN_7DAYS/BAN_PERMANENT
    """
    _ensure_admin(user)
    ok = resolve_user_comment_report(report_id, body, admin_id=user.id, db=db)
    return {"success": ok, "message": "댓글/유저 신고 처리 완료" if ok else "처리에 실패했습니다."}


# ----------------------------
# ✅ 게시글 제재 처리
# ----------------------------
@router.post("/reports/{report_id}/resolve/post")
def api_resolve_post_report(
    report_id: int,
    body: ResolvePostReportRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    [10/20]게시글 신고 처리 (삭제 + 작성자 제재 가능)
    """
    _ensure_admin(user)
    ok = resolve_post_report(report_id, body, admin_id=user.id, db=db)
    return {"success": ok, "message": "게시글 신고 처리 완료" if ok else "처리에 실패했습니다."}
# ✅ [10/20 추가 끝]

# ----------------------------
# ✅ 게시글 승인/거절 (옵션)
# ----------------------------
@router.post("/posts/{post_id}/approve")
def api_approve_post(post_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    게시글 승인 처리
    """
    _ensure_admin(user)
    approve_post(post_id=post_id, admin_id=user.id, db=db)
    return {"success": True, "message": "게시글이 승인되었습니다."}


@router.post("/posts/{post_id}/reject")
def api_reject_post(
    post_id: int,
    reason: Optional[str] = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    게시글 거절 처리
    """
    _ensure_admin(user)
    reject_post(post_id=post_id, admin_id=user.id, reason=reason, db=db)
    return {"success": True, "message": "게시글이 거절되었습니다."}

# ===========================
# ✅ 제재된 유저 목록 조회
# ===========================
@router.get("/banned-users")
def api_list_banned_users(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    현재 제재 중인 유저 목록
    - 상태: BANNED
    """
    _ensure_admin(user)
    items = list_banned_users(db=db)
    return {"success": True, "data": items, "message": "제재된 유저 목록 조회 성공"}


# ===========================
# ✅ [추가됨] 수동 밴
# ===========================
class BanPayload(BaseModel):
    days: Optional[int] = Field(None, description="정지 일수 (None = 영구)")
    reason: Optional[str] = Field(None, description="제재 사유")


@router.post("/users/{user_id}/ban")
def api_ban_user(
    user_id: int,
    payload: BanPayload,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    관리자가 직접 유저를 밴 (일시 정지 또는 영구 정지)
    """
    _ensure_admin(user)
    ban_user(
        target_user_id=user_id,
        admin_id=user.id,
        days=payload.days,
        reason=payload.reason,
        db=db,
    )
    return {
        "success": True,
        "message": f"유저 #{user_id} 제재 완료 ({'영구' if payload.days is None else str(payload.days) + '일'})",
    }


# =========================================================
# ✅ 수동 해제 (UNBAN)
# =========================================================
class UnbanPayload(BaseModel):
    reason: Optional[str] = Field(None, description="해제 사유")


@router.post("/users/{user_id}/unban")
def api_unban_user(
    user_id: int,
    payload: UnbanPayload,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    관리자가 직접 유저 제재를 해제
    """
    _ensure_admin(user)
    unban_user(
        target_user_id=user_id,
        admin_id=user.id,
        reason=payload.reason,
        db=db,
    )
    return {"success": True, "message": f"유저 #{user_id} 제재 해제 완료"}

@router.get("/pending-posts")
def api_get_pending_posts(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    [10/19 수정]
    ✅ 관리자 승인 대기 게시글 조회 API
    - 승인되지 않은(PENDING 상태) 게시글만 가져옴
    - 프로젝트 / 스터디 구분(type)
    - 작성자 닉네임 + 내용 미리보기 포함
    """
    _ensure_admin(user)
    rows = db.execute(
        text("""
            SELECT 
                p.id,                                    -- 게시글 고유 ID
                p.title,                                 -- 게시글 제목
                p.type,                                  -- ✅ 프로젝트 / 스터디 구분
                COALESCE(u.nickname, CONCAT('작성자(', p.leader_id, ')')) AS leader_nickname,  -- ✅ 작성자 닉네임 (닉네임이 NULL이면 "작성자(leader_id)" 형태로 대체)
                LEFT(p.description, 100) AS preview,  -- ✅ 여기 description으로 변경됨         -- ✅ 내용 미리보기
                p.created_at,  -- 게시글 생성일
                p.leader_id    -- 작성자(리더) 사용자 ID
            FROM posts p
            LEFT JOIN users u ON u.id = p.leader_id  -- ✅ 작성자 정보 조인 (닉네임 표시용)
            WHERE p.status = 'PENDING'      -- ✅ 승인 대기 상태만 조회
              AND p.deleted_at IS NULL      -- ✅ 삭제되지 않은 게시글만
            ORDER BY p.created_at DESC      -- ✅ 최신순 정렬
        """)
    ).mappings().all()

    return {
        "success": True,
        "data": [dict(r) for r in rows],
        "message": "승인 대기 게시글 조회 성공",
    }
