# ============================================================
# 🧩 게시판 서비스 로직 (UTC 기준 완전 일관 버전)
# ------------------------------------------------------------
# - NOW()      → UTC_TIMESTAMP()
# - CURRENT_DATE → UTC_DATE()
# - DATE(col)   → col >= UTC_DATE() AND col < (UTC_DATE() + INTERVAL 1 DAY)
# - 모든 집계·조회·수정 시각 UTC 기준으로 통일
# ============================================================

from datetime import date
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

# ─────────────────────────────────────────────────────────
# 공통 상수/유틸
# ─────────────────────────────────────────────────────────
AUTHOR_JOIN = "LEFT JOIN users au ON au.id = bp.author_id"
CATEGORY_JOIN = "LEFT JOIN categories ct ON ct.id = bp.category_id"
VISIBLE_WHERE = "bp.status = 'VISIBLE'"
PREVIEW_LEN = 20


def _preview(content: str) -> str:
    """글 본문 미리보기 (긴 내용은 … 처리)"""
    if not content:
        return ""
    return (content[:PREVIEW_LEN] + "…") if len(content) > PREVIEW_LEN else content


def list_categories(db: Session) -> List[Dict[str, Any]]:
    """카테고리 목록"""
    rows = db.execute(text("SELECT id, name FROM categories ORDER BY id ASC")).mappings().all()
    return [dict(id=r["id"], name=r["name"]) for r in rows]


def find_category_by_name(db: Session, name: str) -> Optional[Dict[str, Any]]:
    """카테고리 단건 조회(이름)"""
    row = db.execute(
        text("SELECT id, name FROM categories WHERE name = :n LIMIT 1"), {"n": name}
    ).mappings().first()
    return dict(id=row["id"], name=row["name"]) if row else None


def get_weekly_hot3(db, now_utc: datetime | None = None) -> List[Dict[str, Any]]:
    """
    🌟 전일 기준 최근 7일(1~7일치 누적) 인기글 Top3 — 오늘은 포함하지 않음
    ✅ hot3_cache 활용 (매일 0시 자동 갱신용)
    """
    print("🚀 [DEBUG] get_weekly_hot3() (캐시 지원 버전) 진입")

    if now_utc is None:
        now_utc = datetime.utcnow()

    # 🔹 1. KST 자정 기준 target_date 계산
    KST = timezone(timedelta(hours=9))
    now_kst = now_utc.astimezone(KST)
    base_kst_midnight = datetime(year=now_kst.year, month=now_kst.month, day=now_kst.day, tzinfo=KST)
    target_kst_midnight = base_kst_midnight  # 오늘 0시
    target_utc = target_kst_midnight.astimezone(timezone.utc)

    # 🔹 2. 캐시 확인
    cached = db.execute(
        text("""
            SELECT hc.board_post_id AS id, bp.title, hc.recent_views, hc.recent_likes, hc.hot_score
            FROM hot3_cache hc
            JOIN board_posts bp ON bp.id = hc.board_post_id
            WHERE DATE(hc.target_date) = DATE(:target_utc)
            ORDER BY hc.hot_score DESC, bp.created_at DESC
            LIMIT 3
        """),
        {"target_utc": target_utc},
    ).mappings().all()

    if cached and len(cached) == 3:
        print(f"✅ [CACHE HIT] {target_kst_midnight.date()} 캐시 사용")
        return [dict(r) for r in cached]

    print(f"⚙️ [CACHE MISS] {target_kst_midnight.date()} 캐시 없음 → 계산 시작")

    # 🔹 3. Top3 직접 계산
    sql = text("""
    WITH kst_midnight AS (
        SELECT CONVERT_TZ(DATE(CONVERT_TZ(:now_utc, '+00:00', '+09:00')), '+09:00', '+00:00') AS base_utc
    )
    SELECT
        bp.id,
        bp.title,
        COALESCE(CAST(v.recent_views AS FLOAT), 0) AS recent_views,
        COALESCE(CAST(l.recent_likes AS FLOAT), 0) AS recent_likes,
        (
            COALESCE(CAST(v.recent_views AS FLOAT), 0) * 0.5 +
            COALESCE(CAST(l.recent_likes AS FLOAT), 0) * 1.0
        ) AS hot_score
    FROM board_posts bp
    LEFT JOIN (
        SELECT board_post_id, COUNT(*) AS recent_views
        FROM board_post_views, kst_midnight
        WHERE
            viewed_at >= (kst_midnight.base_utc - INTERVAL 7 DAY)
            AND viewed_at < kst_midnight.base_utc
        GROUP BY board_post_id
    ) v ON v.board_post_id = bp.id
    LEFT JOIN (
        SELECT board_post_id, COUNT(*) AS recent_likes
        FROM board_post_likes, kst_midnight
        WHERE
            created_at >= (CONVERT_TZ(kst_midnight.base_utc, '+00:00', '+09:00') - INTERVAL 7 DAY)
            AND created_at < CONVERT_TZ(kst_midnight.base_utc, '+00:00', '+09:00')
        GROUP BY board_post_id
    ) l ON l.board_post_id = bp.id
    WHERE bp.status = 'VISIBLE'
    ORDER BY hot_score DESC, bp.created_at DESC
    LIMIT 3
    """)

    rows = db.execute(sql, {"now_utc": now_utc}).mappings().all()
    print(f"✅ [DEBUG] 계산 완료, 결과 수: {len(rows)}")

    if not rows:
        return []

    # 🔹 4. 기존 캐시 삭제 후 삽입
    db.execute(text("DELETE FROM hot3_cache WHERE DATE(target_date) = DATE(:target_utc)"), {"target_utc": target_utc})
    for r in rows:
        db.execute(
            text("""
                INSERT INTO hot3_cache (target_date, board_post_id, recent_views, recent_likes, hot_score)
                VALUES (:target_utc, :pid, :views, :likes, :score)
            """),
            {
                "target_utc": target_utc,
                "pid": r["id"],
                "views": r["recent_views"],
                "likes": r["recent_likes"],
                "score": r["hot_score"],
            },
        )
    db.commit()

    print(f"💾 [CACHE STORED] {len(rows)}건 캐시 저장 완료 ({target_kst_midnight.date()})")
    return [dict(r) for r in rows]

# # ===============================
# # 🔥 오늘 Top3 (당일 조회수 기준)
# # ===============================
# def get_today_top3(db: Session) -> List[Dict[str, Any]]:
#     sql = text(f"""
#         SELECT
#           bp.id, bp.title, bp.content, bp.category_id, ct.name AS category_name,
#           bp.created_at, bp.view_count, bp.like_count,
#           au.id AS author_id, au.nickname, p.profile_image,
#           COUNT(bpv.id) AS today_views,
#           COALESCE(c_count.comment_count, 0) AS comment_count
#         FROM board_posts bp
#         {AUTHOR_JOIN}
#         {CATEGORY_JOIN}
#         LEFT JOIN profiles p ON p.id = au.id
#         LEFT JOIN (
#             SELECT board_post_id, COUNT(*) AS comment_count
#             FROM comments
#             WHERE status = 'VISIBLE'
#             GROUP BY board_post_id
#         ) AS c_count ON c_count.board_post_id = bp.id
#         JOIN board_post_views bpv ON bpv.board_post_id = bp.id
#         WHERE {VISIBLE_WHERE}
#           AND DATE(bpv.viewed_at) = CURRENT_DATE
#         GROUP BY bp.id, ct.name, au.id, au.nickname, p.profile_image, c_count.comment_count
#         ORDER BY today_views DESC, bp.created_at DESC
#         LIMIT 3
#     """)
#     rows = db.execute(sql).mappings().all()
#     return [
#         dict(
#             id=r["id"],
#             title=r["title"],
#             content_preview=_preview(r["content"]),
#             category_id=r["category_id"],
#             category_name=r["category_name"],
#             created_at=r["created_at"],
#             view_count=r["view_count"],
#             like_count=r["like_count"],
#             comment_count=r["comment_count"],
#             author=dict(
#                 id=r["author_id"], nickname=r["nickname"], profile_image=r["profile_image"]
#             ),
#             today_views=r["today_views"],
#         )
#         for r in rows
#     ]


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


# ============================================================
# 📄 게시글 단건 조회 + 조회수 증가 (UTC 중복 제한)
# ============================================================
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
        WHERE board_post_id = :pid
          AND ((:vid IS NOT NULL AND viewer_id = :vid)
               OR (:vid IS NULL AND ip_address = :ip))
          AND viewed_at >= UTC_DATE()
          AND viewed_at < (UTC_DATE() + INTERVAL 1 DAY)
        LIMIT 1
        """),
        {"pid": post_id, "vid": viewer_id, "ip": ip_address},
    ).first()

    if not chk:
        db.execute(
            text("""
                INSERT INTO board_post_views (board_post_id, viewer_id, ip_address, user_agent)
                VALUES (:pid, :vid, :ip, :ua)
            """),
            {"pid": post_id, "vid": viewer_id, "ip": ip_address, "ua": user_agent},
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


# ============================================================
# 📝 게시글 생성 / 수정 / 삭제 (UTC_TIMESTAMP)
# ============================================================
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
        text(f"UPDATE board_posts SET {', '.join(sets)}, updated_at = UTC_TIMESTAMP() WHERE id = :id"),
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
        text("UPDATE board_posts SET status='DELETED', deleted_at=UTC_TIMESTAMP() WHERE id=:id"),
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

    # ✅ 신고 접수 시 관리자 알림 트리거
    from app.events.events import on_report_created
    on_report_created(report_id=res.lastrowid, reporter_user_id=reporter_id)

    return res.lastrowid
