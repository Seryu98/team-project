# backend/app/board/board_service.py
from datetime import date
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

# 상수 정의
AUTHOR_JOIN = "LEFT JOIN users au ON au.id = bp.author_id"
CATEGORY_JOIN = "LEFT JOIN categories ct ON ct.id = bp.category_id"
VISIBLE_WHERE = "bp.status = 'VISIBLE'"
PREVIEW_LEN = 20


# ===============================
# 🔹 미리보기 문자열 자르기
# ===============================
def _preview(content: str) -> str:
    if not content:
        return ""
    return (content[:PREVIEW_LEN] + "…") if len(content) > PREVIEW_LEN else content


# ===============================
# 📚 카테고리 목록
# ===============================
def list_categories(db: Session) -> List[Dict[str, Any]]:
    rows = db.execute(text("SELECT id, name FROM categories ORDER BY id ASC")).mappings().all()
    return [dict(id=r["id"], name=r["name"]) for r in rows]


def find_category_by_name(db: Session, name: str) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text("SELECT id, name FROM categories WHERE name = :n LIMIT 1"), {"n": name}
    ).mappings().first()
    return dict(id=row["id"], name=row["name"]) if row else None


# ===============================
# 🔥 오늘 Top3 (당일 조회수 기준)
# ===============================
def get_today_top3(db: Session) -> List[Dict[str, Any]]:
    sql = text(f"""
        SELECT
          bp.id, bp.title, bp.content, bp.category_id, ct.name AS category_name,
          bp.created_at, bp.view_count, bp.like_count,
          au.id AS author_id, au.nickname, p.profile_image,
          COUNT(bpv.id) AS today_views,
          COALESCE(c_count.comment_count, 0) AS comment_count
        FROM board_posts bp
        {AUTHOR_JOIN}
        {CATEGORY_JOIN}
        LEFT JOIN profiles p ON p.id = au.id
        LEFT JOIN (
            SELECT board_post_id, COUNT(*) AS comment_count
            FROM comments
            WHERE status = 'VISIBLE'
            GROUP BY board_post_id
        ) AS c_count ON c_count.board_post_id = bp.id
        JOIN board_post_views bpv ON bpv.board_post_id = bp.id
        WHERE {VISIBLE_WHERE}
          AND DATE(bpv.viewed_at) = CURRENT_DATE
        GROUP BY bp.id, ct.name, au.id, au.nickname, p.profile_image, c_count.comment_count
        ORDER BY today_views DESC, bp.created_at DESC
        LIMIT 3
    """)
    rows = db.execute(sql).mappings().all()
    return [
        dict(
            id=r["id"],
            title=r["title"],
            content_preview=_preview(r["content"]),
            category_id=r["category_id"],
            category_name=r["category_name"],
            created_at=r["created_at"],
            view_count=r["view_count"],
            like_count=r["like_count"],
            comment_count=r["comment_count"],
            author=dict(
                id=r["author_id"], nickname=r["nickname"], profile_image=r["profile_image"]
            ),
            today_views=r["today_views"],
        )
        for r in rows
    ]


# ===============================
# 📰 게시글 목록
# ===============================
def list_posts(
    db: Session,
    sort: str,
    order: str,
    category_ids: Optional[List[int]],
    start_date: Optional[date],
    end_date: Optional[date],
    q: Optional[str],
    page: int,
    page_size: int,
) -> Tuple[List[Dict[str, Any]], int]:
    sort_col = {
        "created_at": "bp.created_at",
        "view_count": "bp.view_count",
        "like_count": "bp.like_count",
    }.get(sort, "bp.created_at")

    order_kw = "ASC" if order.lower() == "asc" else "DESC"
    where = [VISIBLE_WHERE]
    params: Dict[str, Any] = {}

    if category_ids:
        where.append("bp.category_id IN :cat_ids")
        params["cat_ids"] = tuple(category_ids)
    if start_date:
        where.append("DATE(bp.created_at) >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where.append("DATE(bp.created_at) <= :end_date")
        params["end_date"] = end_date
    if q:
        where.append("(bp.title LIKE :kw OR bp.content LIKE :kw)")
        params["kw"] = f"%{q}%"

    where_sql = " AND ".join(where)
    total = db.execute(
        text(f"SELECT COUNT(*) FROM board_posts bp WHERE {where_sql}"), params
    ).scalar_one()

    offset = (page - 1) * page_size
    sql = text(f"""
        SELECT
          bp.id, bp.title, bp.content, bp.category_id, ct.name AS category_name,
          bp.created_at, bp.view_count, bp.like_count,
          au.id AS author_id, au.nickname, p.profile_image,
          COALESCE(COUNT(c.id), 0) AS comment_count
        FROM board_posts bp
        {AUTHOR_JOIN}
        {CATEGORY_JOIN}
        LEFT JOIN profiles p ON p.id = au.id
        LEFT JOIN comments c ON c.board_post_id = bp.id AND c.status = 'VISIBLE'
        WHERE {where_sql}
        GROUP BY bp.id, ct.name, au.id, au.nickname, p.profile_image
        ORDER BY {sort_col} {order_kw}
        LIMIT :limit OFFSET :offset
    """)
    rows = db.execute(sql, {**params, "limit": page_size, "offset": offset}).mappings().all()

    return [
        dict(
            id=r["id"],
            title=r["title"],
            content_preview=_preview(r["content"]),
            category_id=r["category_id"],
            category_name=r["category_name"],
            created_at=r["created_at"],
            view_count=r["view_count"],
            like_count=r["like_count"],
            comment_count=r["comment_count"],
            author=dict(
                id=r["author_id"], nickname=r["nickname"], profile_image=r["profile_image"]
            ),
        )
        for r in rows
    ], total


# ===============================
# 📄 게시글 단건 조회 + 조회수 증가
# ===============================
def get_post_and_touch_view(
    db: Session,
    post_id: int,
    viewer_id: Optional[int],
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text(f"""
        SELECT bp.*, ct.name AS category_name, au.id AS author_id, au.nickname, p.profile_image
        FROM board_posts bp
        {CATEGORY_JOIN}
        {AUTHOR_JOIN}
        LEFT JOIN profiles p ON p.id = au.id
        WHERE bp.id = :pid AND {VISIBLE_WHERE}
        LIMIT 1
        """),
        {"pid": post_id},
    ).mappings().first()

    if not row or row["status"] != "VISIBLE":
        return None

    chk = db.execute(
        text("""
        SELECT 1 FROM board_post_views
        WHERE board_post_id = :pid AND ip_address = :ip AND DATE(viewed_at) = CURRENT_DATE
        LIMIT 1
        """),
        {"pid": post_id, "ip": ip_address},
    ).first()

    if not chk:
        db.execute(
            text("""
                INSERT INTO board_post_views (board_post_id, ip_address, user_agent)
                VALUES (:pid, :ip, :ua)
            """),
            {"pid": post_id, "ip": ip_address, "ua": user_agent},
        )
        db.execute(
            text("UPDATE board_posts SET view_count = view_count + 1 WHERE id = :pid"),
            {"pid": post_id},
        )
        db.commit()

    comment_count = db.execute(
        text("SELECT COUNT(*) FROM comments WHERE board_post_id = :pid AND status='VISIBLE'"),
        {"pid": post_id},
    ).scalar_one()

    return dict(
        id=row["id"],
        title=row["title"],
        content=row["content"],
        category_id=row["category_id"],
        category_name=row["category_name"],
        author=dict(
            id=row["author_id"], nickname=row["nickname"], profile_image=row["profile_image"]
        ),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        view_count=row["view_count"],
        like_count=row["like_count"],
        comment_count=comment_count,
    )


# ===============================
# 📝 게시글 생성 / 수정 / 삭제
# ===============================
def create_post(db: Session, author_id: int, data: Dict[str, Any]) -> int:
    res = db.execute(
        text("""
        INSERT INTO board_posts (category_id, author_id, title, content, attachment_url)
        VALUES (:category_id, :author_id, :title, :content, :attachment_url)
    """),
        {
            "category_id": data.get("category_id"),
            "author_id": author_id,
            "title": data["title"],
            "content": data["content"],
            "attachment_url": data.get("attachment_url"),
        },
    )
    db.commit()
    return res.lastrowid


def update_post(db: Session, post_id: int, author_id: int, data: Dict[str, Any]) -> bool:
    own = db.execute(
        text("SELECT 1 FROM board_posts WHERE id=:id AND author_id=:uid AND status='VISIBLE'"),
        {"id": post_id, "uid": author_id},
    ).first()
    if not own:
        return False
    sets, params = [], {"id": post_id}
    for k in ("category_id", "title", "content", "attachment_url"):
        if k in data and data[k] is not None:
            sets.append(f"{k} = :{k}")
            params[k] = data[k]
    if not sets:
        return True
    db.execute(
        text(f"UPDATE board_posts SET {', '.join(sets)}, updated_at = NOW() WHERE id = :id"),
        params,
    )
    db.commit()
    return True


def delete_post(db: Session, post_id: int, author_id: int) -> bool:
    own = db.execute(
        text("SELECT 1 FROM board_posts WHERE id=:id AND author_id=:uid AND status='VISIBLE'"),
        {"id": post_id, "uid": author_id},
    ).first()
    if not own:
        return False
    db.execute(
        text("UPDATE board_posts SET status='DELETED', deleted_at=NOW() WHERE id=:id"),
        {"id": post_id},
    )
    db.commit()
    return True


# ===============================
# ❤️ 좋아요
# ===============================
def toggle_like(db: Session, post_id: int, user_id: int) -> Tuple[bool, int]:
    mine = db.execute(
        text("SELECT 1 FROM board_posts WHERE id=:id AND author_id=:uid"),
        {"id": post_id, "uid": user_id},
    ).first()
    if mine:
        return False, -1

    liked = db.execute(
        text("SELECT 1 FROM board_post_likes WHERE board_post_id=:pid AND user_id=:uid"),
        {"pid": post_id, "uid": user_id},
    ).first()

    if liked:
        db.execute(
            text("DELETE FROM board_post_likes WHERE board_post_id=:pid AND user_id=:uid"),
            {"pid": post_id, "uid": user_id},
        )
        db.execute(
            text("UPDATE board_posts SET like_count = GREATEST(like_count-1,0) WHERE id=:pid"),
            {"pid": post_id},
        )
    else:
        db.execute(
            text("INSERT INTO board_post_likes (board_post_id, user_id) VALUES (:pid, :uid)"),
            {"pid": post_id, "uid": user_id},
        )
        db.execute(
            text("UPDATE board_posts SET like_count = like_count+1 WHERE id=:pid"),
            {"pid": post_id},
        )
    db.commit()
    cnt = db.execute(
        text("SELECT like_count FROM board_posts WHERE id=:pid"), {"pid": post_id}
    ).scalar_one()
    return True, cnt


# ===============================
# 💬 댓글 / 대댓글 CRUD + 신고
# ===============================
def list_comments(db: Session, post_id: int) -> List[Dict[str, Any]]:
    parents = db.execute(
        text("""
        SELECT c.id, c.user_id, u.nickname, p.profile_image, c.content, c.status, c.created_at
        FROM comments c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN profiles p ON p.id = u.id
        WHERE c.board_post_id = :pid AND c.parent_id IS NULL
        ORDER BY c.created_at ASC
    """),
        {"pid": post_id},
    ).mappings().all()

    parent_ids = [r["id"] for r in parents] or [0]
    replies = db.execute(
        text(f"""
        SELECT c.id, c.parent_id, c.user_id, u.nickname, p.profile_image, c.content, c.status, c.created_at
        FROM comments c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN profiles p ON p.id = u.id
        WHERE c.board_post_id = :pid AND c.parent_id IN ({','.join(map(str, parent_ids))})
        ORDER BY c.created_at ASC
    """),
        {"pid": post_id},
    ).mappings().all()

    reply_map: Dict[int, List[Dict[str, Any]]] = {}
    for r in replies:
        reply_map.setdefault(r["parent_id"], []).append(
            dict(
                id=r["id"],
                user=dict(
                    id=r["user_id"],
                    nickname=r["nickname"],
                    profile_image=r["profile_image"],
                ),
                content=(
                    "삭제된 댓글입니다." if r["status"] == "DELETED" else r["content"]
                ),
                status=r["status"],
                created_at=r["created_at"],
                parent_id=r["parent_id"],
            )
        )

    threads = []
    for r in parents:
        threads.append(
            dict(
                comment=dict(
                    id=r["id"],
                    user=dict(
                        id=r["user_id"],
                        nickname=r["nickname"],
                        profile_image=r["profile_image"],
                    ),
                    content=(
                        "삭제된 댓글입니다." if r["status"] == "DELETED" else r["content"]
                    ),
                    status=r["status"],
                    created_at=r["created_at"],
                    parent_id=None,
                ),
                replies=reply_map.get(r["id"], []),
            )
        )
    return threads


def create_comment(db: Session, post_id: int, user_id: int, content: str, parent_id: Optional[int]) -> int:
    if parent_id:
        ok = db.execute(
            text("SELECT 1 FROM comments WHERE id=:cid AND board_post_id=:pid"),
            {"cid": parent_id, "pid": post_id},
        ).first()
        if not ok:
            raise ValueError("부모 댓글이 존재하지 않습니다.")
    res = db.execute(
        text(
            "INSERT INTO comments (board_post_id, user_id, parent_id, content) VALUES (:pid, :uid, :parent_id, :content)"
        ),
        {"pid": post_id, "uid": user_id, "parent_id": parent_id, "content": content},
    )
    db.commit()
    return res.lastrowid


def delete_comment(db: Session, comment_id: int, user_id: int) -> bool:
    own = db.execute(
        text("SELECT board_post_id, user_id FROM comments WHERE id=:cid"),
        {"cid": comment_id},
    ).mappings().first()
    if not own:
        return False

    post = db.execute(
        text("SELECT author_id FROM board_posts WHERE id=:pid"),
        {"pid": own["board_post_id"]},
    ).mappings().first()

    if not post:
        return False

    is_comment_author = own["user_id"] == user_id
    is_post_author = post["author_id"] == user_id

    if not (is_comment_author or is_post_author):
        return False

    db.execute(
        text("""
            UPDATE comments
            SET status='DELETED',
                content='삭제된 댓글입니다.',
                deleted_at=NOW()
            WHERE id=:cid
        """),
        {"cid": comment_id},
    )
    db.commit()
    return True


def update_comment(db: Session, comment_id: int, user_id: int, content: str) -> bool:
    if not content or not content.strip():
        return False
    own = db.execute(
        text("SELECT 1 FROM comments WHERE id=:cid AND user_id=:uid AND status='VISIBLE'"),
        {"cid": comment_id, "uid": user_id},
    ).first()
    if not own:
        return False

    db.execute(
        text("UPDATE comments SET content=:ct, updated_at=NOW() WHERE id=:cid"),
        {"ct": content.strip(), "cid": comment_id},
    )
    db.commit()
    return True


def create_report(
    db: Session, reporter_id: int, target_type: str, target_id: int, reason: str
) -> int:
    if target_type == "BOARD_POST":
        row = db.execute(
            text("SELECT author_id AS uid FROM board_posts WHERE id=:id"), {"id": target_id}
        ).mappings().first()
    elif target_type == "COMMENT":
        row = db.execute(
            text("SELECT user_id AS uid FROM comments WHERE id=:id"), {"id": target_id}
        ).mappings().first()
    else:
        raise ValueError("허용되지 않는 신고 타입입니다.")
    if not row:
        raise ValueError("신고 대상이 존재하지 않습니다.")

    res = db.execute(
        text(
            "INSERT INTO reports (reported_user_id, reporter_user_id, target_type, target_id, reason) VALUES (:reported, :reporter, :tt, :tid, :reason)"
        ),
        {
            "reported": row["uid"],
            "reporter": reporter_id,
            "tt": target_type,
            "tid": target_id,
            "reason": reason,
        },
    )
    db.commit()
    return res.lastrowid
