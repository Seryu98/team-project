# app/stats/stats_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/user-ranking")
def get_user_ranking(db: Session = Depends(get_db)):
    sql = text("""
    SELECT 
        u.id,
        u.nickname,
        p.image_path AS avatar_path,  
        COUNT(DISTINCT f.follower_id) AS followers,
        COUNT(DISTINCT pp.id) AS project_posts,
        COUNT(DISTINCT b.id) AS board_posts,
        COUNT(DISTINCT bl.user_id) AS board_likes,
        (
          COUNT(DISTINCT f.follower_id) * 1 + 
          (COUNT(DISTINCT pp.id) + COUNT(DISTINCT b.id)) * 2 + 
          COUNT(DISTINCT bl.user_id) * 3
        ) AS score
    FROM users u
    LEFT JOIN profiles p ON u.id = p.id                 
    LEFT JOIN follows f ON u.id = f.following_id
    LEFT JOIN posts pp ON u.id = pp.leader_id
    LEFT JOIN board_posts b ON u.id = b.author_id
    LEFT JOIN board_post_likes bl ON b.id = bl.board_post_id
    GROUP BY u.id, u.nickname, p.image_path             
    ORDER BY score DESC
    """)
    
    result = db.execute(sql).mappings().all()
    
    ranking = []
    for row in result:
        ranking.append({
            "id": row["id"],
            "nickname": row["nickname"],
            "avatar_path": row["avatar_path"],  
            "followers": row["followers"],
            "project_posts": row["project_posts"],
            "board_posts": row["board_posts"],
            "board_likes": row["board_likes"],
            "score": row["score"],
        })
    return ranking
