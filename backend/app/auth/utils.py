# app/auth/utils.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user_session import UserSession
from app.users.user_model import User
import logging
from uuid import uuid4
import asyncio

# 🔹 WebSocket 매니저 가져오기 (FORCED_LOGOUT 알림용)
from app.notifications.notification_ws_manager import ws_manager

logger = logging.getLogger(__name__)

# ===============================================================
# 🧩 단일 로그인 & 세션 관리 유틸
# ===============================================================

def _invalidate_all_sessions(db: Session, user_id: int):
    """
    ✅ 특정 사용자의 모든 세션을 비활성화 (로그인 시 단일 세션 유지)
    + 기존 활성 세션에 WebSocket으로 강제 로그아웃(FORCED_LOGOUT) 전송
    """
    try:
        now = datetime.utcnow()

        # 🔹 비활성화할 세션들 조회
        inactive_sessions = (
            db.query(UserSession)
            .filter(UserSession.user_id == user_id, UserSession.is_active == True)
            .all()
        )

        # 🔹 세션 비활성화
        for sess in inactive_sessions:
            sess.is_active = False
            sess.terminated_at = now

        db.flush()
        db.commit()

        # 🔹 기존 세션 클라이언트에게 강제 로그아웃 신호 전송
        if inactive_sessions:
            try:
                asyncio.create_task(
                    ws_manager.send_to_user(
                        str(user_id),
                        {
                            "type": "FORCED_LOGOUT",
                            "message": "다른 기기에서 로그인되어 로그아웃되었습니다.",
                        },
                    )
                )
                logger.info(f"📡 WebSocket 로그아웃 알림 전송 user_id={user_id}")
            except Exception as e:
                logger.warning(f"⚠️ WebSocket 로그아웃 전송 실패 user_id={user_id}: {e}")

        logger.info(f"✅ 세션 무효화 완료 user_id={user_id}, 비활성화된 세션 수={len(inactive_sessions)}")

    except Exception as e:
        db.rollback()
        logger.exception(f"❌ 세션 무효화 실패 user_id={user_id}: {e}")


def _create_session(
    db: Session,
    user_id: int,
    token: str,
    device_id: str = None,
    ip: str = None
):
    """
    ✅ 새로운 세션 생성 (로그인 또는 소셜 로그인 시)
    """
    try:
        sess = UserSession(
            user_id=user_id,
            device_id=device_id or str(uuid4()),
            token=token,
            ip=ip,
            is_active=True,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=1)
        )

        db.add(sess)
        db.flush()
        db.commit()
        db.refresh(sess)

        logger.info(f"🆕 세션 생성 완료 user_id={user_id}, session_id={sess.id}")
        return sess

    except Exception as e:
        db.rollback()
        logger.exception(f"❌ 세션 생성 실패 user_id={user_id}: {e}")
        raise


def _validate_refresh_session(db: Session, user_id: int, token: str) -> bool:
    """
    ✅ DB에 저장된 refresh 세션 유효성 확인
    """
    try:
        sess = (
            db.query(UserSession)
            .filter(
                UserSession.user_id == user_id,
                UserSession.token == token,
                UserSession.is_active == True
            )
            .first()
        )

        if not sess:
            return False

        if sess.expires_at and sess.expires_at < datetime.utcnow():
            sess.is_active = False
            db.commit()
            logger.info(f"⏰ 세션 만료 user_id={user_id}")
            return False

        return True

    except Exception as e:
        db.rollback()
        logger.exception(f"❌ 세션 검증 실패 user_id={user_id}: {e}")
        return False


def _is_locked(user: User) -> bool:
    """계정 잠금 상태 확인"""
    return bool(user.locked_until and user.locked_until > datetime.utcnow())


def _on_login_fail(user: User):
    """로그인 실패 시 처리"""
    user.failed_attempts = (user.failed_attempts or 0) + 1
    if user.failed_attempts >= 5:  # 예: 5회 이상 실패 시 10분 잠금
        user.locked_until = datetime.utcnow() + timedelta(minutes=10)
        logger.warning(f"🚫 계정 잠금: user_id={user.user_id}, 10분 동안 로그인 불가")


def _on_login_success(user: User):
    """로그인 성공 시 실패 기록 초기화"""
    user.failed_attempts = 0
    user.locked_until = None
