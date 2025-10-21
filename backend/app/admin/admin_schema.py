# app/admin/admin_schema.py
# ✅ 관리자 관련 요청 스키마 모음

from pydantic import BaseModel, Field
from typing import Optional


# ===============================================
# ✅ 댓글 / 유저 신고 처리 요청
# ===============================================
class ResolveUserCommentReportRequest(BaseModel):
    comment_action: str = Field(..., description="댓글 조치 (NONE / HIDE / DELETE)")
    user_action: str = Field(..., description="유저 제재 수준 (NONE / WARNING / BAN_3DAYS / BAN_7DAYS / BAN_PERMANENT)")
    reason: Optional[str] = Field(None, description="처리 사유")


# ===============================================
# ✅ 게시글 신고 처리 요청
# ===============================================
class ResolvePostReportRequest(BaseModel):
    # ✅ [10/21 추가] 기존 post_action 외에 작성자 제재 필드 추가
    post_action: str = Field(..., description="게시글 조치 (DELETE만 허용)")
    user_action: Optional[str] = Field(
        "NONE",
        description="게시글 작성자 제재 수준 (NONE / WARNING / BAN_3DAYS / BAN_7DAYS / BAN_PERMANENT)"
    )
    reason: Optional[str] = Field(None, description="처리 사유")
