# app/notifications/notification_router.py
# ✅ 알림 API 라우터

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List

from app.core.deps import get_current_user, get_db
from app.notifications.notification_model import Notification
from app.notifications.notification_service import list_notifications, mark_read as service_mark_read, unread_count
from app.notifications.notification_ws_manager import manager  # ✅ 단일 로그인 WebSocket 매니저 추가
from app.users.user_model import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ✅ 1. 알림 목록 조회
@router.get("/")
def api_list_notifications(
    only_unread: bool = Query(False),
    limit: int = Query(50),
    user: User = Depends(get_current_user)
):
    """
    사용자 알림 목록 조회
    """
    return {
        "success": True,
        "data": list_notifications(user_id=user.id, only_unread=only_unread, limit=limit)
    }


# ✅ 2. 읽지 않은 알림 개수
@router.get("/unread_count")
def api_unread_count(user: User = Depends(get_current_user)):
    """
    읽지 않은 알림 개수 조회
    """
    return {"success": True, "data": {"count": unread_count(user_id=user.id)}}


# ✅ 3. 알림 읽음 처리
@router.post("/mark_read")
def api_mark_read(
    notification_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    알림 읽음 처리
    """
    if not notification_ids:
        raise HTTPException(status_code=400, detail="알림 ID 목록이 비어있습니다.")

    updated = (
        db.query(Notification)
        .filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == current_user.id
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()

    if updated == 0:
        raise HTTPException(status_code=404, detail="대상 알림을 찾을 수 없습니다.")

    return {"success": True, "message": f"{updated}개의 알림 읽음 처리 완료"}


# ✅ 4. 모든 알림 전체 읽음 처리
@router.post("/read-all")
def api_mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    현재 로그인한 사용자의 모든 알림을 읽음 처리합니다.
    """
    updated = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()

    return {"success": True, "message": f"{updated}개의 알림이 읽음 처리되었습니다."}


# ===============================
# ✅ WebSocket 연결 (단일 로그인 + 실시간 알림)
# ===============================
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    단일 로그인 기반 WebSocket 연결
    - 이미 로그인된 기기가 있을 경우 기존 세션을 강제 종료
    - 연결 유지 중 서버로부터 실시간 알림 수신 가능
    """
    device_info = websocket.headers.get("user-agent", "unknown")

    # 새 연결 등록 (기존 세션이 있다면 자동 강제 종료)
    await manager.connect(websocket, user_id, device_info)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # 클라이언트 ping → 서버 pong
            if msg_type == "PING":
                await websocket.send_json({"type": "PONG", "timestamp": "ok"})

            # 클라이언트에서 수동 로그아웃 시
            elif msg_type == "LOGOUT":
                await manager.disconnect(user_id)
                await websocket.close(code=1000, reason="사용자 로그아웃")
                break

            # 서버-클라이언트 간 일반 메시지 (optional)
            else:
                print(f"[WebSocket] 사용자 {user_id} → {data}")
                await websocket.send_json({
                    "type": "ECHO",
                    "message": f"서버가 수신했습니다: {data}"
                })

    except WebSocketDisconnect:
        await manager.disconnect(user_id)
        print(f"[WebSocket] 사용자 {user_id} 연결 종료됨")
    except Exception as e:
        print(f"[WebSocket] 예외 발생: {e}")
        await manager.disconnect(user_id)
