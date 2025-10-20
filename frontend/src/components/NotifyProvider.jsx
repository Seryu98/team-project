// frontend/src/app/components/NotifyProvider.jsx
import React, { useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * ✅ NotifyProvider
 * - WebSocket을 통해 백엔드의 실시간 알림 수신
 * - 로그인된 유저 ID 기준으로 연결됨
 * - 알림 수신 시 Toast로 사용자에게 표시
 */
const NotifyProvider = ({ children }) => {
  const wsRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return; // 로그인 안된 경우
    const user = JSON.parse(userData);
    if (!user?.id) return;

    // ✅ WebSocket 서버 주소 (FastAPI에서 설정한 경로와 일치)
    const wsUrl = `ws://localhost:8000/ws/notify/${user.id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 WebSocket 연결됨:", wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 WebSocket 메시지 수신:", data);

        // ✅ 상황별 메시지 처리
        if (data.type === "OTHER_DEVICE_LOGIN") {
          toast.warn("다른 기기에서 로그인되었습니다. 본인이 아닐 경우 비밀번호를 변경하세요.", {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "colored",
          });
        } else if (data.type === "FORCE_LOGOUT") {
          toast.error("보안 사유로 로그아웃되었습니다. 다시 로그인해주세요.", {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "colored",
          });
          // 로그아웃 처리 (토큰 삭제 및 페이지 리다이렉트)
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } else {
          // 일반 알림
          toast.info(data.message || "새로운 알림이 있습니다.", {
            position: "top-right",
            autoClose: 4000,
            theme: "light",
          });
        }
      } catch (err) {
        console.error("❌ 알림 메시지 파싱 실패:", err);
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket 연결 종료됨");
    };

    ws.onerror = (error) => {
      console.error("⚠️ WebSocket 에러 발생:", error);
    };

    // ✅ 클린업
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <>
      {children}
      <ToastContainer newestOnTop limit={3} />
    </>
  );
};

export default NotifyProvider;
