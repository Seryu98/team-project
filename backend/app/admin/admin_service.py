# app/admin/admin_service.py
# ✅ 관리자 비즈니스 로직: 게시글 승인/거절, 신고 처리
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from app.core.database import get_db
from app.events.events import on_post_approved, on_report_resolved
from app.notifications.notification_service import send_notification
from app.messages.message_service import send_message

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

# ✅ 신고 처리 (승낙 / 거절)
def resolve_report(report_id: int, admin_id: int, action: str, reason: Optional[str] = None, db: Optional[Session] = None) -> bool:
    """
    - action: 'RESOLVE' 또는 'REJECT'
    - reason: 관리자가 작성한 처리 사유
    """
    if action not in {"RESOLVE", "REJECT"}:
        raise HTTPException(status_code=400, detail="action은 RESOLVE 또는 REJECT 중 하나여야 합니다.")
    
    db, close = _get_db(db)
    try:
        # ✅ 신고 기본 정보 조회
        report = db.execute(text("""
            SELECT id, reporter_user_id, reported_user_id, target_type, target_id
              FROM reports
             WHERE id = :rid
        """), {"rid": report_id}).mappings().first()

        if not report:
            raise HTTPException(status_code=404, detail="신고 내역을 찾을 수 없습니다.")

        reporter_id = report["reporter_user_id"]
        reported_id = report["reported_user_id"]
        target_type = report["target_type"]
        target_id = report["target_id"]

        # ✅ 상태 업데이트
        status = "RESOLVED" if action == "RESOLVE" else "REJECTED"
        db.execute(
            text("UPDATE reports SET status=:st WHERE id=:rid"),
            {"st": status, "rid": report_id},
        )

        # ✅ 관리자 조치 로그 기록
        db.execute(text("""
            INSERT INTO report_actions (report_id, admin_id, action, reason)
            VALUES (:rid, :aid, :act, :reason)
        """), {
            "rid": report_id,
            "aid": admin_id,
            "act": action,
            "reason": reason or "(사유 없음)"
        })

        # --------------------------------------------------
        # 🚨 처리 분기
        # --------------------------------------------------

        # 신고 "승낙" → 신고자 + 피신고자 모두에게 알림/쪽지
        if action == "RESOLVE":
            # 신고자에게 알림
            send_notification(
                user_id=reporter_id,
                type_="REPORT_RESOLVED",
                message=f"신고가 승인되어 처리되었습니다.",
                related_id=report_id,
                db=db,
            )
            send_message(
                sender_id=admin_id,
                receiver_id=reporter_id,
                content=f"당신이 제기한 신고(ID:{report_id})가 승인되었습니다.\n\n사유: {reason or '관리자에 의해 조치가 완료되었습니다.'}",
                db=db,
            )

            # 피신고자에게 알림
            send_notification(
                user_id=reported_id,
                type_="WARNING",
                message="귀하의 게시물/댓글/메시지가 신고로 인해 경고 조치를 받았습니다.",
                related_id=report_id,
                db=db,
            )
            send_message(
                sender_id=admin_id,
                receiver_id=reported_id,
                content=f"귀하의 콘텐츠({target_type}:{target_id})가 신고되어 조치가 이루어졌습니다.\n\n관리자 사유: {reason or '규정 위반에 따른 경고 조치입니다.'}",
                db=db,
            )

        # 신고 "거절" → 신고자에게만 알림/쪽지
        elif action == "REJECT":
            send_notification(
                user_id=reporter_id,
                type_="REPORT_REJECTED",
                message="신고가 검토되었으나 반려되었습니다.",
                related_id=report_id,
                db=db,
            )
            send_message(
                sender_id=admin_id,
                receiver_id=reporter_id,
                content=f"당신의 신고(ID:{report_id})가 거절되었습니다.\n\n거절 사유: {reason or '부적절한 신고로 판단되었습니다.'}",
                db=db,
            )

        # ✅ 이벤트 트리거 (로그용)
        on_report_resolved(
            report_id=report_id,
            reporter_user_id=reporter_id,
            resolved=(action == "RESOLVE"),
            db=db,
        )

        db.commit()
        return True

    finally:
        if close:
            db.close()

def get_admin_stats(db: Session):
    """
    관리자 대시보드 통계 조회용
    """
    result = {
        "pending_posts": 0,
        "pending_reports": 0,
    }

    # ✅ 승인 대기 게시글 수
    result["pending_posts"] = db.execute(
        text("SELECT COUNT(*) FROM posts WHERE status = 'PENDING'")
    ).scalar() or 0

    # ✅ 처리 대기 신고 수
    result["pending_reports"] = db.execute(
        text("SELECT COUNT(*) FROM reports WHERE status = 'PENDING'")
    ).scalar() or 0

    return result