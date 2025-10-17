# backend/app/test/test_weekly_hot3.py
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.main import app
from app.core.database import get_db
from app.board import board_model as models

client = TestClient(app)


def kst_midnight_days_ago(days: int) -> datetime:
    """KST 자정 기준 days일 전을 UTC로 변환"""
    now_utc = datetime.now(timezone.utc)
    kst_now = now_utc + timedelta(hours=9)
    kst_midnight = kst_now.replace(hour=0, minute=0, second=0, microsecond=0)
    target_kst = kst_midnight - timedelta(days=days)
    return target_kst - timedelta(hours=9)


def test_weekly_hot3(db: Session = next(get_db())):
    """✅ 하루 경과 시 첫날 데이터가 집계에서 제외되는지 검증"""

    category = db.query(models.Category).first()
    if not category:
        category = models.Category(name="테스트 카테고리")
        db.add(category)
        db.commit()
        db.refresh(category)

    post = models.BoardPost(
        title="주간 테스트 게시글",
        content="이건 주간 롤링 가중치 테스트용 게시글입니다.",
        author_id=1,
        category_id=category.id,
        status="VISIBLE",
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # ✅ 8일치 더미 데이터 생성 (UTC 저장)
    for i, user_id in enumerate(range(10, 18)):
        db.add(models.BoardPostView(
            board_post_id=post.id,
            viewer_id=user_id,
            viewed_at=kst_midnight_days_ago(7 - i),
            ip_address=f"127.0.0.{i}",
            user_agent="pytest"
        ))
        db.add(models.BoardPostLike(
            board_post_id=post.id,
            user_id=user_id,
            created_at=kst_midnight_days_ago(7 - i),
        ))
    db.commit()

    # ① 현재 시점 집계
    now_utc = datetime.utcnow()
    res1 = client.get(f"/board/top3-weekly?now_utc={now_utc.isoformat()}")
    assert res1.status_code == 200
    item = res1.json()[0]
    print("\n✅ [현재 집계 결과]", item)

    # ② 하루 뒤(=UTC+24h) 집계
    future_utc = now_utc + timedelta(days=1)
    res2 = client.get(f"/board/top3-weekly?now_utc={future_utc.isoformat()}")
    assert res2.status_code == 200
    new_item = res2.json()[0]
    print("\n✅ [하루 뒤 집계 결과]", new_item)

    # 🔹 검증: 하루 뒤엔 첫날 데이터 제외되어야 함
    assert new_item["recent_views"] < item["recent_views"], "❌ 하루 경과 시 첫날 데이터 제외 안 됨"
    assert new_item["recent_likes"] < item["recent_likes"], "❌ 하루 경과 시 첫날 데이터 제외 안 됨"

    print("\n🎯 테스트 통과 — KST 자정 기준 7일 롤링 정상 작동 ✅")
