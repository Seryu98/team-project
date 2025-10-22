// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Modal from "./Modal"; // ✅ 공용 모달 컴포넌트 불러오기

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id"); // ✅ JWT decode된 사용자 ID
  const navigate = useNavigate();
  const [showForcedLogout, setShowForcedLogout] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");

  useEffect(() => {
    if (!userId || !token) return;

    // ✅ WebSocket 연결 (단일 로그인 정책 대응)
    // 기존: ws://localhost:8000/ws/${userId}
    // 수정: 백엔드 라우터 구조에 맞게 토큰 인증 방식으로 변경
    const ws = new WebSocket(`ws://localhost:8000/ws/notify?token=${token}`);

    ws.onopen = () => console.log("✅ WebSocket 연결됨");

    ws.onmessage = (event) => {
      try {
        // ✅ 문자열 또는 객체 형태 모두 대응
        const rawData = event.data;
        const data =
          typeof rawData === "string" ? JSON.parse(rawData) : rawData;

        console.log("📩 WebSocket 메시지 수신:", data);

        // ✅ 다른 기기에서 로그인되어 현재 세션 로그아웃
        if (data.type === "FORCED_LOGOUT") {
          const messageText =
            typeof data.message === "string" && data.message.trim() !== ""
              ? data.message
              : "다른 기기에서 로그인되어 로그아웃되었습니다.";
          setLogoutMessage(messageText);
          setShowForcedLogout(true);
        }

        // ✅ 추가 알림 이벤트 (백엔드에서 LOGIN_ALERT 등)
        if (data.type === "LOGIN_ALERT") {
          console.log("ℹ️ 로그인 알림:", data.message);
        }

        // ✅ 향후 확장 가능한 이벤트 타입 대비
        if (data.type === "NOTIFY") {
          console.log("🔔 알림 수신:", data.message);
        }
      } catch (err) {
        console.warn("⚠️ WebSocket 메시지 파싱 오류:", err, event.data);
      }
    };

    // ✅ WebSocket 연결 종료 시
    ws.onclose = (event) => {
      console.log("❌ WebSocket 연결 종료됨", event);
      // ❗ reason이 있을 때는 메시지를 직접 띄우지 않음
      // (이미 FORCED_LOGOUT으로 처리됨)
    };

    ws.onerror = (err) => console.error("⚠️ WebSocket 오류:", err);

    return () => {
      ws.close();
    };
  }, [userId, token, navigate]);

  // ✅ 모달 확인 시 처리
  const handleModalConfirm = () => {
    setShowForcedLogout(false);
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  if (!token) {
    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}

      {/* ✅ 다른 기기에서 로그인 시 표시되는 모달 */}
      {showForcedLogout && (
        <Modal
          message={logoutMessage}
          onConfirm={handleModalConfirm}
          confirmText="확인"
        />
      )}
    </>
  );
}
