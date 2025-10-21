# app/notifications/notification_ws_manager.py
from typing import Dict
from fastapi import WebSocket
from asyncio import Lock

class NotificationWebSocketManager:
    """
    ✅ WebSocket 연결 관리 매니저 (thread-safe)
    - user_id별 단일 연결 관리
    - 연결/해제/개인 메시지 전송/전체 브로드캐스트 기능 포함
    """

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.lock = Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        """유저 연결 시 등록"""
        await websocket.accept()
        async with self.lock:
            self.active_connections[user_id] = websocket
        print(f"✅ WebSocket 연결됨 → user_id={user_id}")

    async def disconnect(self, user_id: int):
        """유저 연결 해제"""
        async with self.lock:
            if user_id in self.active_connections:
                del self.active_connections[user_id]
        print(f"❌ WebSocket 연결 해제됨 → user_id={user_id}")

    async def send_to_user(self, user_id: int, message: dict):
        """특정 유저에게 JSON 메시지 전송"""
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
                print(f"📨 실시간 메시지 전송 → user_id={user_id}, message={message}")
            except Exception as e:
                print(f"⚠️ WebSocket 전송 실패({user_id}): {e}")
                await self.disconnect(user_id)

    async def broadcast(self, message: dict):
        """모든 연결된 유저에게 메시지 전송"""
        async with self.lock:
            for user_id, ws in list(self.active_connections.items()):
                try:
                    await ws.send_json(message)
                except Exception:
                    await self.disconnect(user_id)


# ✅ 싱글톤 인스턴스
ws_manager = NotificationWebSocketManager()
