// src/features/auth/SessionManager.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "./api";
import Modal from "../../components/Modal";

/**
 * ✅ SessionManager.jsx
 * - 전역 세션 상태 감시
 * - 다른 기기 로그인(강제 로그아웃) 및 세션 만료 감지
 * - 모달을 통해 사용자에게 알림 후 자동 로그아웃 처리
 */
export default function SessionManager() {
  const navigate = useNavigate();
  const [showForcedLogoutModal, setShowForcedLogoutModal] = useState(false);
  const wsRef = useRef(null);
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));

  // ✅ 토큰 변경 감시 → WebSocket 재연결
  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("access_token");
      setToken(newToken);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ✅ WebSocket 연결 및 강제 로그아웃 처리
  useEffect(() => {
    if (!token) return;

    const pureToken = token.startsWith("Bearer ")
      ? token.replace("Bearer ", "")
      : token;

    // ✅ ws/wss 자동 감지 추가
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost =
      import.meta.env.VITE_BACKEND_HOST || window.location.hostname || "localhost";
    const wsUrl = `${protocol}://${backendHost}:8000/ws/notify?token=${pureToken}`;
    console.log("🌐 [SessionManager] WebSocket 연결 시도:", wsUrl);

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("✅ [SessionManager] WebSocket 연결 성공");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 [SessionManager] 메시지 수신:", data);

        if (data.type === "FORCED_LOGOUT") {
          console.warn("🚨 다른 기기에서 로그인되어 자동 로그아웃됩니다.");
          clearTokens("never");
          setShowForcedLogoutModal(true);
        }
      } catch (err) {
        console.warn("⚠️ WebSocket 메시지 파싱 오류:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("⚠️ [SessionManager] WebSocket 오류:", err);
    };

    socket.onclose = (event) => {
      console.log(
        "❌ [SessionManager] WebSocket 종료:",
        event.code,
        event.reason || ""
      );

      if (event.code === 4001 && event.reason.includes("다른 기기")) {
        console.warn("🚨 WebSocket 종료 사유로 강제 로그아웃 감지됨");
        clearTokens("never");
        setShowForcedLogoutModal(true);
      }
    };

    return () => {
      try {
        socket.close(1000, "SessionManager unmount");
      } catch {}
      wsRef.current = null;
    };
  }, [token]);

  // ✅ 세션 만료 및 로그아웃 감시
  useEffect(() => {
    const interval = setInterval(() => {
      const storedToken = localStorage.getItem("access_token");
      const sessionExpiredFlag = localStorage.getItem("session_expired");

      // 🚫 세션 만료 상태는 App.jsx 모달에서 처리
      if (!storedToken && sessionExpiredFlag === "true") {
        console.log("⏰ 세션 만료 감지 (App.jsx에서 모달 처리 중)");
        return;
      }

      // 🚫 강제 로그아웃 모달이 떠 있을 때는 navigate 중단
      if (showForcedLogoutModal) {
        console.log("🚫 강제 로그아웃 모달 표시 중 → 자동 이동 중단");
        return;
      }

      // ✅ 토큰이 없고 로그인 페이지가 아닐 때만 이동
      if (!storedToken && window.location.pathname !== "/login") {
        console.warn("⚠️ 토큰 없음 → 로그인 페이지로 이동");
        navigate("/login", { replace: true });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [navigate, showForcedLogoutModal]);

  // ✅ 다른 브라우저/탭에서 로그아웃 감지 → 현재 탭도 동기화
  useEffect(() => {
    const handleCrossLogout = (e) => {
      if (e.key === "logout_event") {
        console.log("🔁 다른 브라우저/탭에서 로그아웃 감지 → 현재 탭도 로그아웃");
        clearTokens("never");
        navigate("/login", { replace: true });
      }
    };
    window.addEventListener("storage", handleCrossLogout);
    return () => window.removeEventListener("storage", handleCrossLogout);
  }, [navigate]);

  // ✅ 모달 표시
  return (
    <>
      {showForcedLogoutModal && (
        <Modal
          title="다른 기기에서 로그인되어 로그아웃되었습니다."
          confirmText="확인"
          onClose={() => {
            setShowForcedLogoutModal(false);
            navigate("/login", { replace: true });
          }}
          onConfirm={() => {
            setShowForcedLogoutModal(false);
            navigate("/login", { replace: true });
          }}
        >
          보안을 위해 자동으로 로그아웃되었습니다. 다시 로그인해 주세요.
        </Modal>
      )}
    </>
  );
}
