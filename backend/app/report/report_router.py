# app/report/report_router.py
"""
✅ 신고 관련 라우터
- 일반 사용자: 신고 생성 / 내 신고 목록 / 상세 조회
- 관리자: 신고 처리(승낙·거절)는 admin_router에서 담당
- 연동: events.on_report_created / admin_service.resolve_report
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.deps import get_current_user
from app.report.report_service import (
    create_report,
    list_my_reports,
    get_report_detail,
    has_already_reported,
)

router = APIRouter(prefix="/reports", tags=["reports"])

# ----------------------------
# ✅ 요청 스키마 정의
# ----------------------------
TargetType = Literal["POST", "BOARD_POST", "COMMENT", "USER", "MESSAGE"]

class CreateReportRequest(BaseModel):
    """🧾 신고 생성 요청 스키마"""
    target_type: TargetType
    target_id: int
    reason: str

    @field_validator("reason")
    @classmethod
    def _check_reason(cls, v: str):
        if not v or not v.strip():
            raise ValueError("신고 사유는 필수입니다.")
        if len(v.strip()) > 255:
            raise ValueError("신고 사유는 255자 이내로 입력해주세요.")
        return v.strip()

# ----------------------------
# 동일 대상에 대한 신고 중복 여부
# ----------------------------
@router.get("/already")
def api_already_reported(
    target_type: TargetType,
    target_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    동일 대상에 대해 이미 신고했는지 여부 확인
    (중복 신고 방지용 - UX)
    """
    exists = has_already_reported(
        db=db,
        reporter_user_id=user.id,
        target_type=target_type,
        target_id=target_id,
    )
    return {
        "success": True,
        "data": {"already_reported": exists},
        "message": "조회 성공",
    }


# ----------------------------
# 🚨 신고 생성
# ----------------------------
@router.post("/")
def api_create_report(
    req: CreateReportRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    🚨 신고 생성
    - reporter_user_id: 현재 로그인 사용자
    - reported_user_id: service 내부 자동 탐색
    - 중복 신고 방지 (DB UNIQUE 제약 + 사전 검사)
    - 생성 후 관리자에게 on_report_created() 이벤트 발생
    """
    result = create_report(
        db=db,
        reporter_user_id=user.id,
        target_type=req.target_type,
        target_id=req.target_id,
        reason=req.reason,
    )

    if isinstance(result, dict):
        return JSONResponse(content=result, status_code=200)

    return {
        "success": True,
        "data": {"report_id": result},
        "message": "신고가 접수되었습니다.",
    }

# ----------------------------
# 📋 내가 작성한 신고 목록
# ----------------------------
@router.get("/my")
def api_list_my_reports(
    status: Optional[Literal["PENDING", "RESOLVED", "REJECTED"]] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """📋 내가 작성한 신고 목록 조회"""
    items = list_my_reports(
        db=db,
        reporter_user_id=user.id,
        status=status,
        limit=limit,
    )
    return {"success": True, "data": items, "message": "조회 성공"}

# ----------------------------
# 🔍 내 신고 상세보기
# ----------------------------
@router.get("/{report_id}")
def api_get_report_detail(
    report_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """🔍 내가 작성한 신고 상세보기"""
    data = get_report_detail(db=db, report_id=report_id, requester_user_id=user.id)
    if not data:
        raise HTTPException(status_code=404, detail="신고 내역을 찾을 수 없습니다.")
    return {"success": True, "data": data, "message": "조회 성공"}

# ==================================================================
# ✅ 관리자 전용 신고 전체 목록 조회 (pending 포함)
# ==================================================================
@router.get("/all")
def api_list_all_reports(
    status: Optional[str] = Query(None, description="필터 상태 (PENDING/RESOLVED/REJECTED)"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """✅ 관리자용 신고 목록"""
    if getattr(user, "role", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")

    base_query = """
        SELECT r.id, r.reason, r.status, r.created_at,
               ru.nickname AS reporter_nickname,
               tu.nickname AS reported_nickname
          FROM reports r
          JOIN users ru ON ru.id = r.reporter_user_id
          JOIN users tu ON tu.id = r.reported_user_id
         WHERE 1=1
    """
    if status:
        base_query += " AND r.status = :st"
    base_query += " ORDER BY r.created_at DESC"

    params = {"st": status} if status else {}
    rows = db.execute(text(base_query), params).mappings().all()

    return {"success": True, "data": [dict(row) for row in rows], "message": "전체 신고 목록 조회 성공"}