# app/stats/stats_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text  # ✅ 이거 추가!
from app.core.database import get_db

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/user-ranking")
def get_user_ranking(db: Session = Depends(get_db)):
    sql = text("""
    SELECT 
        u.id,
        u.nickname,
        COUNT(DISTINCT f.follower_id) AS followers,
        COUNT(DISTINCT p.id) AS project_posts,
        COUNT(DISTINCT b.id) AS board_posts,
        COUNT(DISTINCT bl.user_id) AS board_likes,
        (
          COUNT(DISTINCT f.follower_id) * 1 + 
          (COUNT(DISTINCT p.id) + COUNT(DISTINCT b.id)) * 2 + 
          COUNT(DISTINCT bl.user_id) * 3
        ) AS score
    FROM users u
    LEFT JOIN follows f ON u.id = f.following_id
    LEFT JOIN posts p ON u.id = p.leader_id
    LEFT JOIN board_posts b ON u.id = b.author_id
    LEFT JOIN board_post_likes bl ON b.id = bl.board_post_id
    GROUP BY u.id, u.nickname
    ORDER BY score DESC
    """)
    
    result = db.execute(sql).fetchall()
    
    ranking = []
    for row in result:
        ranking.append({
            "id": row[0],
            "nickname": row[1],
            "followers": row[2],
            "project_posts": row[3],
            "board_posts": row[4],
            "board_likes": row[5],
            "score": row[6],
        })
    return ranking