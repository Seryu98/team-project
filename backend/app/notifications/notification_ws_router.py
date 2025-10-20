# app/notifications/notification_ws_router.py
# ✅ 실시간 알림(WebSocket) 라우터
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.notifications.notification_ws_manager import ws_manager  # ✅ 변경된 부분

router = APIRouter(prefix="/ws/notify", tags=["notify"])

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """
    실시간 알림 WebSocket 엔드포인트
    - 프론트엔드가 /ws/notify/{user_id} 로 연결
    - 로그인 후 유지되는 동안 서버에서 알림을 push 가능
    """
    await ws_manager.connect(user_id, websocket)  # ✅ 연결 로직 통합
    print(f"🟢 WebSocket 연결됨 → user_id={user_id}")

    try:
        while True:
            # 클라이언트에서 ping 메시지를 받기만 함
            await websocket.receive_text()
    except WebSocketDisconnect:
        # 연결 끊기면 목록에서 제거
        ws_manager.disconnect(user_id)  # ✅ 통합된 disconnect 사용
        print(f"🔴 WebSocket 연결 종료 → user_id={user_id}")
