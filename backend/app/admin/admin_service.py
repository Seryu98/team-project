# app/admin/admin_service.py
# ✅ 관리자 비즈니스 로직: 게시글 승인/거절, 신고 처리
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from app.core.database import get_db
from app.events.events import on_post_approved, on_report_resolved

def _get_db(db: Optional[Session] = None):
    close = False
    if db is None:
        db = next(get_db())
        close = True
    return db, close


# ✅ 게시글 승인
def approve_post(post_id: int, admin_id: int, db: Optional[Session] = None) -> bool:
    db, close = _get_db(db)
    try:
        updated = db.execute(text("""
            UPDATE posts SET status='APPROVED' WHERE id=:pid
        """), {"pid": post_id}).rowcount

        if not updated:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

        leader_id = db.execute(
            text("SELECT leader_id FROM posts WHERE id=:pid"), {"pid": post_id}
        ).scalar()

        db.commit()

        # ✅ 승인 알림 전송
        on_post_approved(post_id=post_id, leader_id=int(leader_id), db=db)
        return True
    finally:
        if close:
            db.close()


# ✅ 게시글 거절
def reject_post(post_id: int, admin_id: int, reason: Optional[str] = None, db: Optional[Session] = None) -> bool:
    db, close = _get_db(db)
    try:
        # ✅ 게시글 상태 전체 변경 (status, recruit_status, project_status)
        updated = db.execute(text("""
            UPDATE posts
               SET status='REJECTED',
                   recruit_status='CLOSED',
                   project_status='ENDED'
             WHERE id=:pid
        """), {"pid": post_id}).rowcount

        if not updated:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

        # (선택) 거절 사유 로그 남기기
        if reason:
            db.execute(text("""
                INSERT INTO admin_actions (admin_id, post_id, action, reason)
                VALUES (:aid, :pid, 'REJECT', :reason)
            """), {"aid": admin_id, "pid": post_id, "reason": reason})
            # admin_actions 테이블이 있다면만 실행됨

        db.commit()
        return True
    finally:
        if close:
            db.close()



# ✅ 신고 처리
def resolve_report(report_id: int, admin_id: int, action: str, reason: Optional[str] = None, db: Optional[Session] = None) -> bool:
    if action not in {"RESOLVE", "REJECT"}:
        raise HTTPException(status_code=400, detail="action은 RESOLVE/REJECT 중 하나여야 합니다.")
    db, close = _get_db(db)
    try:
        status = "RESOLVED" if action == "RESOLVE" else "REJECTED"
        updated = db.execute(text("""
            UPDATE reports SET status=:st WHERE id=:rid
        """), {"st": status, "rid": report_id}).rowcount

        if not updated:
            raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다.")

        reporter_id = db.execute(
            text("SELECT reporter_user_id FROM reports WHERE id=:rid"), {"rid": report_id}
        ).scalar()

        db.commit()

        # ✅ 신고 결과 알림 전송
        on_report_resolved(
            report_id=report_id,
            reporter_user_id=int(reporter_id),
            resolved=(status == "RESOLVED"),
            db=db
        )
        return True
    finally:
        if close:
            db.close()
