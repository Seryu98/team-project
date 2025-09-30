# routers/application.py
from enum import Enum
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db  # ← 프로젝트 구조에 맞게 조정 (예: from app.database import get_db)

from app.notify.application_schemas import (
    ApplicationOut, ApplicationCreate, ApplicationStatus as SchemaStatus, RequiredFieldOut
)
from app.notify.application_service import (
    create_application, list_applications, update_application_status, get_required_fields
)

router = APIRouter(prefix="/applications", tags=["Applications"])

# === placeholder 의존성 (실제 인증/권한 모듈로 교체) ===
def get_current_user_id() -> int:
    return 1  # TODO: 실제 로그인 사용자 ID 반환

def require_role_leader_or_admin():
    return True  # TODO: 실제 권한 가드로 교체

# PENDING 제거한 처리 전용 상태
class ProcessStatus(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

@router.get("/required-fields", response_model=list[RequiredFieldOut])
def required_fields(post_id: int = Query(...), db: Session = Depends(get_db)):
    return get_required_fields(db, post_id)

@router.post("/", response_model=ApplicationOut)
def submit_application(payload: ApplicationCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    app = create_application(db, user_id, payload)
    return ApplicationOut(
        id=app.id,
        user_id=app.user_id,
        post_id=app.post_id,
        status=SchemaStatus(app.status.value),
        created_at=app.created_at,
        answers=[{"field_id": ans.field_id, "answer_text": ans.answer_text}
                 for ans in app.answers if getattr(ans, "deleted_at", None) is None],
    )

@router.get("/", response_model=list[ApplicationOut])
def get_applications(post_id: int | None = None, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    # (선택) 리더 권한 검사: post_id가 있으면 해당 글의 리더인지 확인
    # if post_id is not None:
    #     leader_id = db.execute(text("SELECT leader_id FROM posts WHERE id=:pid"), {"pid": post_id}).scalar()
    #     if leader_id != user_id:
    #         raise HTTPException(status_code=403, detail="권한이 없습니다.")

    apps = list_applications(db, post_id)
    return [
        ApplicationOut(
            id=a.id,
            user_id=a.user_id,
            post_id=a.post_id,
            status=SchemaStatus(a.status.value),
            created_at=a.created_at,
            answers=[{"field_id": ans.field_id, "answer_text": ans.answer_text}
                     for ans in a.answers if getattr(ans, "deleted_at", None) is None],
        ) for a in apps
    ]

@router.put("/{app_id}", response_model=ApplicationOut)
def process_application(
    app_id: int,
    status: ProcessStatus,
    db: Session = Depends(get_db),
    _ = Depends(require_role_leader_or_admin),
    user_id: int = Depends(get_current_user_id),
):
    # (권장) 해당 지원서의 post_id를 찾아 리더 권한 확인
    # pid = db.execute(text("SELECT post_id FROM applications WHERE id=:aid"), {"aid": app_id}).scalar()
    # if pid:
    #     leader_id = db.execute(text("SELECT leader_id FROM posts WHERE id=:pid"), {"pid": pid}).scalar()
    #     if leader_id != user_id:
    #         raise HTTPException(status_code=403, detail="권한이 없습니다.")

    updated = update_application_status(db, app_id, SchemaStatus(status.value), actor_user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found")

    return ApplicationOut(
        id=updated.id,
        user_id=updated.user_id,
        post_id=updated.post_id,
        status=SchemaStatus(updated.status.value),
        created_at=updated.created_at,
        answers=[{"field_id": ans.field_id, "answer_text": ans.answer_text}
                 for ans in updated.answers if getattr(ans, "deleted_at", None) is None],
    )
