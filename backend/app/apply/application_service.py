# services/application_service.py
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import text 

from app.apply.application_model import (
    Application, ApplicationAnswer, ApplicationStatus,
    ApplicationField, PostRequiredField
)
from app.apply.application_schemas import ApplicationCreate, ApplicationStatus as SchemaStatus


def _notify(db: Session, user_id: int, ntype: str, message: str, related_id: Optional[int] = None):
    sql = text("""
        INSERT INTO notifications (user_id, type, message, related_id, is_read, created_at)
        VALUES (:user_id, :type, :message, :related_id, FALSE, NOW())
    """)
    db.execute(sql, {"user_id": user_id, "type": ntype, "message": message, "related_id": related_id})

def get_required_fields(db: Session, post_id: int) -> List[dict]:
    q = (
        db.query(PostRequiredField.field_id, ApplicationField.name)
        .join(ApplicationField, ApplicationField.id == PostRequiredField.field_id)
        .filter(PostRequiredField.post_id == post_id)
    )
    return [{"field_id": fid, "name": name} for fid, name in q.all()]

def create_application(db: Session, user_id: int, payload: ApplicationCreate) -> Application:
    # 서버 측 필수 질문 검증
    required_ids = {r["field_id"] for r in get_required_fields(db, payload.post_id)}
    provided_ids = {a.field_id for a in payload.answers}
    missing = required_ids - provided_ids
    if missing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"필수 질문 누락: {sorted(missing)}")

    app = Application(post_id=payload.post_id, user_id=user_id, status=ApplicationStatus.PENDING)
    db.add(app)
    db.flush()  # app.id 확보

    rows = [ApplicationAnswer(application_id=app.id, field_id=a.field_id, answer_text=a.answer_text)
            for a in payload.answers]
    db.add_all(rows)
    db.commit()
    db.refresh(app)

    # 게시글 리더에게 APPLICATION 알림
    leader_id = db.execute(text("SELECT leader_id FROM posts WHERE id = :pid"), {"pid": payload.post_id}).scalar()
    if leader_id:
        _notify(db, user_id=leader_id, ntype="APPLICATION", message="새 지원서가 접수되었습니다.", related_id=app.id)
        db.commit()

    return app

def list_applications(db: Session, post_id: Optional[int] = None) -> List[Application]:
    q = db.query(Application).options(selectinload(Application.answers))
    if post_id:
        q = q.filter(Application.post_id == post_id)
    return q.order_by(Application.created_at.desc()).all()

def update_application_status(db: Session, app_id: int, new_status: SchemaStatus, actor_user_id: int) -> Optional[Application]:
    app = db.query(Application).options(selectinload(Application.answers)).filter(Application.id == app_id).first()
    if not app:
        return None

    app.status = ApplicationStatus(new_status.value)
    db.commit()
    db.refresh(app)

    # 지원자에게 승인/거절 알림
    if app.status == ApplicationStatus.APPROVED:
        _notify(db, user_id=app.user_id, ntype="APPLICATION_ACCEPTED", message="지원이 승인되었습니다.", related_id=app.id)
    elif app.status == ApplicationStatus.REJECTED:
        _notify(db, user_id=app.user_id, ntype="APPLICATION_REJECTED", message="지원이 거절되었습니다.", related_id=app.id)
    db.commit()

    return app
