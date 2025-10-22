# app/notifications/notification_ws_manager.py
from typing import Dict
from fastapi import WebSocket
from asyncio import Lock
import asyncio  # ✅ (추가) sleep 사용을 위해 import

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
            # ✅ 이미 연결된 세션이 존재하면 → 기존 세션 강제 로그아웃 처리
            if user_id in self.active_connections:
                old_ws = self.active_connections[user_id]
                try:
                    # ✅ 명시적으로 로그아웃 알림 전송
                    await old_ws.send_json({
                        "type": "FORCED_LOGOUT",
                        "message": "다른 기기에서 로그인되어 로그아웃되었습니다."
                    })
                    print(f"⚠️ 중복 연결 감지 → 기존 세션 강제 로그아웃 알림 전송 user_id={user_id}")

                    # ✅ (중요) 메시지가 클라이언트로 실제 전송될 시간을 확보
                    await asyncio.sleep(1)  # ⏱️ 기존 0.3초 → 1초로 늘려 안정화

                except Exception as e:
                    print(f"⚠️ 기존 세션 로그아웃 알림 실패: user_id={user_id}, error={e}")

                # ✅ 기존 세션 종료 시 reason도 통일
                try:
                    await old_ws.close(code=4001, reason="다른 기기에서 로그인되어 로그아웃되었습니다.")
                except Exception:
                    pass

                del self.active_connections[user_id]

            # 새 연결 등록
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
        else:
            print(f"ℹ️ send_to_user: 현재 연결 없음 user_id={user_id}")

    async def broadcast(self, message: dict):
        """모든 연결된 유저에게 메시지 전송"""
        async with self.lock:
            for user_id, ws in list(self.active_connections.items()):
                try:
                    await ws.send_json(message)
                except Exception:
                    await self.disconnect(user_id)

    # ✅ 추가: 현재 연결 상태 조회 (디버깅용)
    def get_active_user_ids(self):
        """현재 연결 중인 유저 ID 리스트 반환"""
        return list(self.active_connections.keys())


# ✅ 싱글톤 인스턴스
ws_manager = NotificationWebSocketManager()
