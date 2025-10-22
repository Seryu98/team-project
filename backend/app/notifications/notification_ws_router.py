# app/notifications/notification_ws_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.notifications.notification_ws_manager import ws_manager
from app.core.security import verify_token
import logging

router = APIRouter(prefix="/ws", tags=["notifications"])

@router.websocket("/notify")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """
    ✅ 실시간 알림 WebSocket 엔드포인트
    - 프론트엔드 연결 주소: ws://localhost:8000/ws/notify?token=ACCESS_TOKEN
    - 토큰 검증 후 user_id 추출하여 연결 등록
    """
    # ✅ 토큰 유효성 검사
    if not token:
        await websocket.close(code=4001)
        return

    payload = verify_token(token, expected_type="access")
    if not payload:
        await websocket.close(code=4002)
        return

    # ✅ user_id를 반드시 int로 변환 (🚨 중요 수정)
    try:
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4003)
        return

    # ✅ 연결 성공
    await ws_manager.connect(user_id, websocket)
    logging.info(f"✅ WebSocket 연결 성공: user_id={user_id}")

    try:
        while True:
            data = await websocket.receive_text()
            logging.debug(f"📩 WebSocket 수신: {data}")
            # 필요하면 echo나 ping 응답 추가 가능
    except WebSocketDisconnect:
        await ws_manager.disconnect(user_id)
        logging.info(f"❌ WebSocket 연결 종료: user_id={user_id}")
    except Exception as e:
        logging.error(f"⚠️ WebSocket 오류: {e}")
        await ws_manager.disconnect(user_id)
