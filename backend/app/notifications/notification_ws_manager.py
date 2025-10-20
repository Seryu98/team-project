# app/notifications/notification_ws_manager.py
from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    """
    ✅ WebSocket 연결 상태를 관리하는 클래스
    - 각 user_id 별로 활성화된 연결을 관리
    - 특정 유저에게 개인 메시지를 전송 가능
    """

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """유저가 WebSocket 연결을 맺을 때 호출"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"✅ WebSocket 연결됨: user_id={user_id}")

    def disconnect(self, user_id: int):
        """WebSocket 연결 해제 시 호출"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"❌ WebSocket 연결 해제됨: user_id={user_id}")

    def is_user_connected(self, user_id: int) -> bool:
        """해당 유저가 현재 WebSocket에 연결 중인지 확인"""
        return user_id in self.active_connections

    async def send_personal_message(self, user_id: int, message: dict):
        """특정 유저에게 JSON 메시지 전송"""
        websocket = self.active_connections.get(user_id)
        if websocket:
            try:
                await websocket.send_json(message)
                print(f"📨 메시지 전송됨 → user_id={user_id}, message={message}")
            except Exception as e:
                print(f"⚠️ WebSocket 전송 실패 ({user_id}): {e}")
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        """모든 유저에게 메시지 전송"""
        to_remove = []
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                to_remove.append(user_id)
        for uid in to_remove:
            self.disconnect(uid)


# ✅ 싱글톤 인스턴스 생성
ws_manager = ConnectionManager()
