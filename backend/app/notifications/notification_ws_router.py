# app/notifications/notification_ws_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.notifications.notification_ws_manager import ws_manager
from app.core.security import verify_token
import logging
import json
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError

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
        await websocket.close(code=4001, reason="Missing access token")
        logging.warning("⚠️ WebSocket 연결 거부: 토큰 누락")
        return

    payload = verify_token(token, expected_type="access")
    if not payload:
        await websocket.close(code=4002, reason="Invalid access token")
        logging.warning("⚠️ WebSocket 연결 거부: 잘못된 토큰")
        return

    # ✅ user_id를 반드시 int로 변환 (🚨 중요 수정)
    try:
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4003, reason="Invalid user_id in token")
        logging.warning("⚠️ WebSocket 연결 거부: user_id 변환 실패")
        return

    # ✅ 기존 세션이 있으면 모두 강제 종료 후 새 연결 등록
    await ws_manager.force_logout_all(user_id)
    await ws_manager.connect(user_id, websocket)
    logging.info(f"✅ WebSocket 연결 성공: user_id={user_id}")

    try:
        while True:
            data = await websocket.receive_text()
            logging.debug(f"📩 WebSocket 수신: {data}")

            # 필요하면 echo나 ping 응답 추가 가능
            # 예: if data == "ping": await websocket.send_text("pong")

            # 클라이언트 측에서 JSON 형태로 메시지를 보내는 경우 대비
            try:
                msg_json = json.loads(data)
                if msg_json.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass

    except WebSocketDisconnect:
        # ✅ 클라이언트의 정상 종료
        await ws_manager.disconnect(user_id)
        logging.info(f"❌ WebSocket 연결 종료 (정상): user_id={user_id}")

    except (ConnectionClosedOK, ConnectionClosedError):
        # ✅ 비정상 종료 또는 서버 종료 시
        await ws_manager.disconnect(user_id)
        logging.warning(f"⚠️ WebSocket 연결 비정상 종료: user_id={user_id}")

    except Exception as e:
        # ✅ 기타 예외
        logging.error(f"⚠️ WebSocket 오류: {e}")
        await ws_manager.disconnect(user_id)
        try:
            await websocket.close(code=4004, reason="Internal Server Error")
        except Exception:
            pass
        logging.error(f"❌ WebSocket 강제 종료: user_id={user_id}, error={e}")
