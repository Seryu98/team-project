# backend/app/board/board_router.py
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import text
from app.board import board_service as svc
from app.board.board_schema import (
    BoardPostCard,
    BoardPostDetail,
    BoardPostCreate,
    BoardPostUpdate,
    CommentCreate,
    CommentThread,
    ReportCreate,
)
from app.core.database import get_db
from app.core.deps import get_current_user
from app.board.board_schema import BoardWeeklyHot, BoardWeeklyHotLite
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/board", tags=["Board"])

# ===============================
# 📚 카테고리 목록
# ===============================
@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return svc.list_categories(db)


# ===============================
# 🔥 주간 Top3 (최근 7일 기준)
# ===============================
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta, timezone

@router.get("/top3-weekly")
def top3_weekly(
    days_offset: int = Query(0, description="KST 자정 기준 일 단위 오프셋 (예: -1=어제, +1=내일)"),
    db: Session = Depends(get_db),
):
    """
    🌙 KST 자정 기준으로 최근 7일 롤링 Top3
    - ?days_offset=-1 → 어제 0시 기준
    - ?days_offset=1  → 내일 0시 기준
    """
    KST = timezone(timedelta(hours=9))
    now_kst = datetime.now(KST)
    base_kst_midnight = datetime(
        year=now_kst.year, month=now_kst.month, day=now_kst.day, tzinfo=KST
    )
    target_kst = base_kst_midnight + timedelta(days=days_offset)
    now_utc = target_kst.astimezone(timezone.utc)

    # 🔥 주간 인기글 계산
    results = svc.get_weekly_hot3(db, now_utc=now_utc)

    # ✅ 각 게시글의 상세 정보 보강
    enriched = []
    for r in results:
        post = db.execute(
            text("""
                SELECT 
                    bp.id, bp.title, bp.view_count, bp.like_count, bp.created_at,
                    ct.name AS category_name,
                    au.id AS author_id, au.nickname, p.profile_image
                FROM board_posts bp
                LEFT JOIN users au ON au.id = bp.author_id
                LEFT JOIN profiles p ON p.id = au.id
                LEFT JOIN categories ct ON ct.id = bp.category_id
                WHERE bp.id = :pid
            """),
            {"pid": r["id"]},
        ).mappings().first()

        if post:
            enriched.append({
                "id": r["id"],
                "title": post["title"],
                "category_name": post["category_name"],
                "author": {
                    "id": post["author_id"],
                    "nickname": post["nickname"] or "탈퇴한 사용자",
                    "profile_image": post["profile_image"],
                },
                # ✅ datetime → 문자열로 변환 (핵심 수정)
                "created_at": post["created_at"].isoformat() if post["created_at"] else None,
                "view_count": post["view_count"],
                "like_count": post["like_count"],
                "recent_views": r.get("recent_views", 0),
                "recent_likes": r.get("recent_likes", 0),
                "hot_score": r.get("hot_score", 0.0),
                "badge": r.get("badge"),  # 🔥 추가!
            })

    # ✅ FastAPI에서 안전하게 JSON 직렬화
    return JSONResponse(content=jsonable_encoder(enriched))




# # ===============================
# # 🔥 오늘 Top3 (오늘 조회수 기준)
# # ===============================
# @router.get("/top3-today", response_model=List[BoardPostCard])
# def top3_today(db: Session = Depends(get_db)):
#     return svc.get_today_top3(db)


# ===============================
# 📰 게시글 목록
# ===============================
def _map_sort(sort: str) -> str:
    return {
        "latest": "created_at",
        "views": "view_count",
        "likes": "like_count",
    }.get(sort, "created_at")


@router.get("")
@router.get("/")
def list_posts(
    category: Optional[str] = Query(None),
    sort: str = Query("latest"),
    search: Optional[str] = Query(None),
    page: int = 1,
    page_size: int = 10,
    category_ids: Optional[List[int]] = Query(None),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    if category and not category_ids:
        cat = svc.find_category_by_name(db, category)
        category_ids = [cat["id"]] if cat else None

    sort_col = _map_sort(sort)
    items, total = svc.list_posts(
        db=db,
        sort=sort_col,
        order=order,
        category_ids=category_ids,
        start_date=None,
        end_date=None,
        q=search,
        page=page,
        page_size=page_size,
    )

    # ✅ Top3도 enriched 버전으로 보강
    top3_raw = svc.get_weekly_hot3(db)
    enriched = []
    for r in top3_raw:
        post = db.execute(
            text("""
                SELECT 
                    bp.id, bp.title, bp.view_count, bp.like_count, bp.created_at,
                    ct.name AS category_name,
                    au.id AS author_id, au.nickname, p.profile_image
                FROM board_posts bp
                LEFT JOIN users au ON au.id = bp.author_id
                LEFT JOIN profiles p ON p.id = au.id
                LEFT JOIN categories ct ON ct.id = bp.category_id
                WHERE bp.id = :pid
            """),
            {"pid": r["id"]},
        ).mappings().first()

        if post:
            enriched.append({
                "id": r["id"],
                "title": post["title"],
                "category_name": post["category_name"],
                "author": {
                    "id": post["author_id"],
                    "nickname": post["nickname"] or "탈퇴한 사용자",
                    "profile_image": post["profile_image"],
                },
                "created_at": post["created_at"],
                "view_count": post["view_count"],
                "like_count": post["like_count"],
                "recent_views": r.get("recent_views", 0),
                "recent_likes": r.get("recent_likes", 0),
                "hot_score": r.get("hot_score", 0.0),
                "badge": r.get("badge"),
            })

    return {"posts": items, "top_posts": enriched, "total": total}


# ===============================
# 📄 게시글 상세 + 댓글 포함
# ===============================
@router.get("/{post_id}")
def get_post_detail(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    me=Depends(get_current_user),  # ✅ 추가
):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")

    # ✅ 로그인 여부에 따라 viewer_id 전달
    viewer_id = me.id if me else None

    post = svc.get_post_and_touch_view(
        db=db,
        post_id=post_id,
        viewer_id=viewer_id,
        ip_address=ip,
        user_agent=ua,
    )
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    comments = svc.list_comments(db, post_id)
    return {"post": post, "comments": comments}


# ===============================
# 📝 게시글 생성
# ===============================
@router.post("", status_code=201)
def create_post(payload: BoardPostCreate, db: Session = Depends(get_db), me=Depends(get_current_user)):
    new_id = svc.create_post(db=db, author_id=me.id, data=payload.dict(exclude_unset=True))
    return {"id": new_id}


# ===============================
# ✏️ 게시글 수정
# ===============================
@router.put("/{post_id}")
def update_post(post_id: int, payload: BoardPostUpdate, db: Session = Depends(get_db), me=Depends(get_current_user)):
    ok = svc.update_post(db, post_id=post_id, author_id=me.id, data=payload.dict(exclude_unset=True))
    if not ok:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")
    return {"success": True}


# ===============================
# 🗑 게시글 삭제
# ===============================
@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), me=Depends(get_current_user)):
    ok = svc.delete_post(db, post_id=post_id, author_id=me.id)
    if not ok:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")
    return {"success": True}


# ❤️ 좋아요 토글
@router.post("/{post_id}/like")
def like_toggle(post_id: int, db: Session = Depends(get_db), me=Depends(get_current_user)):
    ok, count = svc.toggle_like(db, post_id=post_id, user_id=me.id)
    if not ok and count == -1:
        return {"success": False, "message": "자신의 게시글에는 좋아요 불가"}
    return {"success": True, "like_count": count}


# ===============================
# 💬 댓글 관련
# ===============================
@router.get("/{post_id}/comments", response_model=List[CommentThread])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    return svc.list_comments(db, post_id)


@router.post("/{post_id}/comments", status_code=201)
def create_comment(post_id: int, payload: CommentCreate, db: Session = Depends(get_db), me=Depends(get_current_user)):
    new_id = svc.create_comment(
        db=db,
        post_id=post_id,
        user_id=me.id,
        content=payload.content,
        parent_id=payload.parent_id,
    )
    return {"id": new_id}


@router.delete("/comments/{comment_id}")
def remove_comment(comment_id: int, db: Session = Depends(get_db), me=Depends(get_current_user)):
    ok = svc.delete_comment(db, comment_id=comment_id, user_id=me.id)
    if not ok:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")
    return {"success": True}


# ✏️ ✅ 댓글 수정
@router.put("/comments/{comment_id}")
def update_comment(comment_id: int, payload: CommentCreate, db: Session = Depends(get_db), me=Depends(get_current_user)):
    ok = svc.update_comment(db=db, comment_id=comment_id, user_id=me.id, content=payload.content)
    if not ok:
        raise HTTPException(status_code=403, detail="수정 권한이 없거나 댓글이 존재하지 않습니다.")
    return {"success": True, "message": "댓글이 수정되었습니다."}


# ===============================
# 🚨 신고
# ===============================
@router.post("/reports", status_code=201)
def report(payload: ReportCreate, db: Session = Depends(get_db), me=Depends(get_current_user)):
    rid = svc.create_report(
        db=db,
        reporter_id=me.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
    )
    return {"id": rid, "success": True}
