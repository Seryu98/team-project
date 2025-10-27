# app/notifications/notification_ws_manager.py

import json
import asyncio
from typing import Dict
from fastapi import WebSocket
from datetime import datetime, timedelta
from app.core.config import MAX_SESSIONS_PER_USER, SESSION_CLEANUP_INTERVAL


class ConnectionManager:
    """
    ✅ 단일 로그인 및 실시간 알림 WebSocket 관리 클래스
    - 각 user_id 당 1개의 WebSocket 연결만 유지
    - 중복 로그인 발생 시 기존 연결을 강제 종료
    - 주기적으로 세션 정리 (비정상 종료된 세션 제거)
    """

    def __init__(self):
        # { user_id: {"socket": WebSocket, "device": str, "last_active": datetime} }
        self.active_connections: Dict[str, Dict] = {}

        # ✅ 추가됨: thread-safe 보호용 락
        self.lock = asyncio.Lock()

        # 세션 정리 태스크 (이벤트 루프 준비 후 실행)
        asyncio.get_event_loop().create_task(self._safe_cleanup_start())

    async def _safe_cleanup_start(self):
        """이벤트 루프 준비 후 주기적 세션 정리 태스크 시작"""
        await asyncio.sleep(1)
        asyncio.create_task(self._cleanup_inactive_sessions())

    async def connect(
        self, websocket: WebSocket, user_id: str, device_info: str = "unknown"
    ):
        """새 WebSocket 연결 시도"""
        user_id = str(user_id)  # ✅ 수정됨: 모든 user_id를 문자열로 통일
        await websocket.accept()
        print(f"🔥 connect() called for user_id={user_id}")

        # ✅ 추가됨: 이전 세션이 있으면 실제로 살아있는지 ping 테스트
        if user_id in self.active_connections:
            old_socket = self.active_connections[user_id]["socket"]
            try:
                await old_socket.send_json({"type": "PING_CHECK"})
                print(f"🟢 기존 세션({user_id})이 여전히 활성 상태로 감지됨")
            except Exception:
                # 🔴 기존 세션이 이미 종료된 상태 → 정리 후 새 세션 허용
                await self.disconnect(user_id)
                print(f"💀 이전 세션이 이미 종료되어 정리됨: {user_id}")

        async with self.lock:  # ✅ 동시 접근 방지
            # 이미 연결된 세션이 있다면 → 기존 세션 종료
            if user_id in self.active_connections:
                print(f"⚠️ 기존 세션 존재 → 강제 종료 시도: {user_id}")
                old_session = self.active_connections[user_id]
                old_socket: WebSocket = old_session["socket"]
                try:
                    # ✅ 프론트와 동일한 이벤트 키로 변경 ("FORCED_LOGOUT")
                    await old_socket.send_json(
                        {
                            "type": "FORCED_LOGOUT",
                            "message": "🚨 다른 기기에서 로그인되어 자동 로그아웃됩니다.",
                        }
                    )
                    await asyncio.sleep(
                        1.0
                    )  # ✅ 전송 안정화 대기 (기존 0.3 → 1.0초로 변경)
                    try:
                        await old_socket.close(
                            code=4001, reason="다른 기기에서 로그인됨"
                        )
                    except Exception as e:
                        print(f"⚠️ 기존 소켓 종료 중 예외 발생: {e}")
                    print(f"✅ 기존 세션 강제 종료 완료: {user_id}")
                except Exception as e:
                    print(f"❌ 기존 세션 종료 중 오류: {e}")

                # ✅ 추가됨: race condition 방지용 안정화 대기
                await asyncio.sleep(0.5)

            # 새 세션 등록
            self.active_connections[user_id] = {
                "socket": websocket,
                "device": device_info,
                "last_active": datetime.utcnow(),
            }
            print(
                f"[SessionManager] 새로운 WebSocket 세션 등록: {user_id} ({device_info})"
            )

    async def disconnect(self, user_id: str):
        """사용자 연결 해제"""
        user_id = str(user_id)  # ✅ 수정됨: 문자열로 변환
        async with self.lock:  # ✅ 동시 disconnect 방지
            if user_id in self.active_connections:
                try:
                    socket = self.active_connections[user_id]["socket"]
                    await socket.close(code=1000, reason="사용자 연결 종료")
                except Exception:
                    pass
                del self.active_connections[user_id]
                print(f"[SessionManager] 세션 해제 완료: {user_id}")

    async def send_personal_message(self, user_id: str, message: dict):
        """특정 사용자에게 메시지 전송"""
        user_id = str(user_id)  # ✅ 수정됨: 문자열로 변환
        async with self.lock:
            if user_id not in self.active_connections:
                print(f"[SessionManager] 사용자 {user_id}의 활성 세션 없음")
                return
            try:
                websocket = self.active_connections[user_id]["socket"]
                await websocket.send_json(message)
                print(f"[SessionManager] 메시지 전송 완료 → {user_id}: {message}")
            except Exception as e:
                print(f"[SessionManager] 메시지 전송 오류 → {user_id}: {e}")
                await self.disconnect(user_id)

    async def broadcast(self, message: dict):
        """모든 사용자에게 메시지 전송"""
        disconnected_users = []
        async with self.lock:
            for user_id, session in self.active_connections.items():
                try:
                    await session["socket"].send_json(message)
                except Exception:
                    disconnected_users.append(user_id)

        # 끊어진 세션 정리
        for user_id in disconnected_users:
            await self.disconnect(user_id)

    async def _cleanup_inactive_sessions(self):
        """주기적으로 비활성 세션 정리"""
        while True:
            await asyncio.sleep(SESSION_CLEANUP_INTERVAL)
            now = datetime.utcnow()
            to_remove = []
            async with self.lock:
                for user_id, session in list(self.active_connections.items()):
                    last_active = session.get("last_active", now)
                    # 30분 이상 비활성 상태면 정리
                    if now - last_active > timedelta(minutes=30):
                        to_remove.append(user_id)
            for user_id in to_remove:
                await self.disconnect(user_id)
                print(f"[SessionManager] 비활성 세션 자동 정리: {user_id}")

    def get_active_users(self):
        """현재 활성 사용자 목록 조회"""
        return list(self.active_connections.keys())


# ✅ 전역 매니저 인스턴스 (FastAPI reload되어도 동일하게 유지)
import sys

# ✅ reload-safe global instance (sys.modules 기반)
if "global_ws_manager" not in sys.modules:
    sys.modules["global_ws_manager"] = ConnectionManager()

manager = sys.modules["global_ws_manager"]
