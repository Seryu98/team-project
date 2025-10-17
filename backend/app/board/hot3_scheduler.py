# backend/app/board/hot3_scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.board.board_service import get_weekly_hot3

scheduler = BackgroundScheduler(timezone="Asia/Seoul")

def refresh_hot3_cache():
    """매일 자정마다 주간 인기글 캐시 생성"""
    db: Session = SessionLocal()
    try:
        print("🕛 [SCHEDULER] 주간 인기글 캐시 갱신 시작")
        now_kst = datetime.now(timezone(timedelta(hours=9)))
        now_utc = now_kst.astimezone(timezone.utc)
        get_weekly_hot3(db, now_utc=now_utc)
        print("✅ [SCHEDULER] 캐시 갱신 완료")
    except Exception as e:
        print(f"❌ [SCHEDULER] 캐시 갱신 실패: {e}")
    finally:
        db.close()

def start_scheduler():
    """스케줄러 시작"""
    # 즉시 한 번 실행 (서버 시작 시 캐시 생성)
    refresh_hot3_cache()

    # 이후 매일 0시 실행
    scheduler.add_job(refresh_hot3_cache, "cron", hour=0, minute=0)
    scheduler.start()
    print("⏰ Hot3 자동 캐시 스케줄러 실행 중 (매일 0시 + 최초 1회)")
