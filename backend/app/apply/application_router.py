from enum import Enum
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session 
from sqlalchemy import text

# ✅ DB 세션
from app.core.database import get_db

# ✅ 스키마 & 서비스 불러오기
from app.apply.application_schemas import (
    ApplicationOut,
    ApplicationCreate,
    ApplicationStatus as SchemaStatus,
    RequiredFieldOut,
)
from app.apply.application_service import (
    create_application,
    list_applications,
    update_application_status,
    get_required_fields,
)

router = APIRouter(prefix="/applications", tags=["Applications"])


# ======================================
# 1) 현재 사용자 가져오기 (임시 버전)
#    - 실제 운영에서는 JWT 토큰에서 user_id, role을 추출해야 함
# ======================================
def get_current_user() -> dict:
    """
    현재 로그인한 사용자 정보를 반환.
    실제 구현에서는 JWT 파싱 필요.
    지금은 임시로 id=1, role="LEADER" 고정.
    """
    return {"id": 1, "role": "LEADER"}


# ======================================
# 2) 권한 체크 함수
#    - 관리자(ADMIN): 모든 지원서 승인/거절 가능
#    - 리더(LEADER): 본인 게시글의 지원서만 처리 가능
# ======================================
def check_permission(app_id: int, db: Session, current_user: dict):
    # 지원서가 속한 post_id 조회
    pid = db.execute(
        text("SELECT post_id FROM applications WHERE id=:aid"),
        {"aid": app_id}
    ).scalar()

    if not pid:
        raise HTTPException(status_code=404, detail="Application not found")

    # 게시글 리더 조회
    leader_id = db.execute(
        text("SELECT leader_id FROM posts WHERE id=:pid"),
        {"pid": pid}
    ).scalar()

    # 관리자면 통과
    if current_user["role"] == "ADMIN":
        return True

    # 리더면 자기 글에 대해서만 통과
    if current_user["id"] == leader_id:
        return True

    # 그 외에는 권한 없음
    raise HTTPException(status_code=403, detail="권한이 없습니다.")


# ======================================
# 3) 처리 전용 상태 (PENDING 제외)
# ======================================
class ProcessStatus(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ======================================
# 4) 라우터들
# ======================================

@router.get("/required-fields", response_model=list[RequiredFieldOut])
def required_fields(
    post_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """
    특정 게시글에 필요한 '필수 질문 목록' 조회
    """
    return get_required_fields(db, post_id)


@router.post("/", response_model=ApplicationOut)
def submit_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    지원서 제출
    """
    app = create_application(db, current_user["id"], payload)
    return ApplicationOut(
        id=app.id,
        user_id=app.user_id,
        post_id=app.post_id,
        status=SchemaStatus(app.status.value),
        created_at=app.created_at,
        answers=[
            {"field_id": ans.field_id, "answer_text": ans.answer_text}
            for ans in app.answers
            if getattr(ans, "deleted_at", None) is None
        ],
    )

@router.get("/", response_model=list[ApplicationOut])
def get_applications(
    post_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    지원서 목록 조회
    (리더는 자기 글만, 관리자는 전체 가능하도록 이후 확장 가능)
    """
    apps = list_applications(db, post_id)
    return [
        ApplicationOut(
            id=a.id,
            user_id=a.user_id,
            post_id=a.post_id,
            status=SchemaStatus(a.status.value),
            created_at=a.created_at,
            answers=[
                {"field_id": ans.field_id, "answer_text": ans.answer_text}
                for ans in a.answers
                if getattr(ans, "deleted_at", None) is None
            ],
        )
        for a in apps
    ]


@router.put("/{app_id}", response_model=ApplicationOut)
def process_application(
    app_id: int,
    status: ProcessStatus,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    지원서 승인/거절 처리
    (리더/관리자만 가능)
    """
    # ✅ 권한 체크
    check_permission(app_id, db, current_user)

    updated = update_application_status(
        db,
        app_id,
        SchemaStatus(status.value),
        actor_user_id=current_user["id"],
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")

    return ApplicationOut(
        id=updated.id,
        user_id=updated.user_id,
        post_id=updated.post_id,
        status=SchemaStatus(updated.status.value),
        created_at=updated.created_at,
        answers=[
            {"field_id": ans.field_id, "answer_text": ans.answer_text}
            for ans in updated.answers
            if getattr(ans, "deleted_at", None) is None
        ],
    )
