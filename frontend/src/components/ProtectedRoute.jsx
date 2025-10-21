// src/components/ProtectedRoute.jsx
import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_id"); // ✅ JWT decode된 사용자 ID
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !token) return;

    // ✅ WebSocket 연결 (단일 로그인 정책 대응)
    // 기존: ws://localhost:8000/ws/${userId}
    // 수정: 백엔드 라우터 구조에 맞게 토큰 인증 방식으로 변경
    const ws = new WebSocket(`ws://localhost:8000/ws/notify?token=${token}`);

    ws.onopen = () => console.log("✅ WebSocket 연결됨");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 WebSocket 메시지 수신:", data);

        if (data.type === "FORCED_LOGOUT") {
          alert(data.message);
          localStorage.clear();
          navigate("/login", { replace: true });
        }

        if (data.type === "LOGIN_ALERT") {
          alert(data.message);
        }
      } catch (err) {
        console.warn("⚠️ WebSocket 메시지 파싱 오류:", err);
      }
    };

    ws.onclose = () => console.log("❌ WebSocket 연결 종료됨");
    ws.onerror = (err) => console.error("⚠️ WebSocket 오류:", err);

    return () => {
      ws.close();
    };
  }, [userId, token, navigate]);

  if (!token) {
    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />;
  }
  return children;
}
