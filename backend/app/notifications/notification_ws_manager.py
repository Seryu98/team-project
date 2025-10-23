# app/notifications/notification_ws_manager.py
from typing import Dict, List, Union
from fastapi import WebSocket
from asyncio import Lock
import asyncio
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError


class NotificationWebSocketManager:
    """
    ✅ WebSocket 연결 관리 매니저 (thread-safe)
    - user_id별 복수 연결 관리 (브라우저별 세션 구분)
    - 연결/해제/개인 메시지 전송/전체 브로드캐스트 기능 포함
    """

    def __init__(self):
        # ✅ 한 user_id가 여러 기기/브라우저로 동시에 접속할 수 있도록 변경
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.lock = Lock()

    async def connect(self, user_id: Union[int, str], websocket: WebSocket):
        """유저 연결 시 등록"""
        user_id = int(user_id) if not isinstance(user_id, int) else user_id
        await websocket.accept()
        async with self.lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)

        print(f"✅ WebSocket 연결됨 → user_id={user_id}, 총 연결수={len(self.active_connections[user_id])}")

    async def disconnect(self, user_id: Union[int, str], websocket: WebSocket = None):
        """유저 연결 해제"""
        user_id = int(user_id) if not isinstance(user_id, int) else user_id
        async with self.lock:
            if user_id in self.active_connections:
                if websocket and websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

        print(f"❌ WebSocket 연결 해제됨 → user_id={user_id}")

    async def send_to_user(self, user_id: Union[int, str], message: dict):
        """특정 유저의 모든 연결(WebSocket)로 JSON 메시지 전송"""
        try:
            user_id = int(user_id) if not isinstance(user_id, int) else user_id
        except ValueError:
            print(f"⚠️ send_to_user: 잘못된 user_id 타입 ({user_id})")
            return

        connections = self.active_connections.get(user_id, [])
        if not connections:
            print(f"ℹ️ send_to_user: 현재 연결 없음 user_id={user_id}")
            return

        # ✅ 모든 연결에 메시지 전송 (다중 브라우저 지원)
        for ws in list(connections):
            try:
                await ws.send_json(message)
                print(f"📨 실시간 메시지 전송 → user_id={user_id}, message={message}")
            except (ConnectionClosedOK, ConnectionClosedError):
                print(f"⚠️ WebSocket 연결 종료됨 (user_id={user_id}) — 제거 처리")
                await self.disconnect(user_id, ws)
            except Exception as e:
                print(f"⚠️ WebSocket 전송 실패({user_id}): {e}")
                await self.disconnect(user_id, ws)

    async def broadcast(self, message: dict):
        """모든 연결된 유저에게 메시지 전송"""
        async with self.lock:
            for user_id, ws_list in list(self.active_connections.items()):
                for ws in list(ws_list):
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        print(f"⚠️ broadcast 실패: user_id={user_id}, error={e}")
                        await self.disconnect(user_id, ws)

    async def force_logout_all(self, user_id: Union[int, str]):
        """✅ 해당 유저의 모든 연결에 강제 로그아웃 메시지 전송"""
        await self.send_to_user(
            user_id,
            {
                "type": "FORCED_LOGOUT",
                "message": "다른 기기에서 로그인되어 로그아웃되었습니다."
            }
        )
        await asyncio.sleep(0.5)
        await self._close_all(user_id)

    async def _close_all(self, user_id: int):
        """내부용: 해당 유저의 모든 WebSocket 닫기"""
        async with self.lock:
            conns = self.active_connections.get(user_id, [])
            for ws in list(conns):
                try:
                    await ws.close(code=4001, reason="다른 기기에서 로그인되어 로그아웃되었습니다.")
                except Exception:
                    pass
            if user_id in self.active_connections:
                del self.active_connections[user_id]
        print(f"🧹 모든 WebSocket 세션 종료 → user_id={user_id}")

    # ✅ 추가: 현재 연결 상태 조회 (디버깅용)
    def get_active_user_ids(self):
        """현재 연결 중인 유저 ID 리스트 반환"""
        return list(self.active_connections.keys())


# ✅ 싱글톤 인스턴스
ws_manager = NotificationWebSocketManager()
