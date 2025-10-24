// src/features/auth/SessionManager.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearTokens } from "./api";
import Modal from "../../components/Modal";

export default function SessionManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showForcedLogoutModal, setShowForcedLogoutModal] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
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

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost =
      import.meta.env.VITE_BACKEND_HOST ||
      window.location.hostname ||
      "localhost";
    const wsUrl = `${protocol}://${backendHost}:8000/ws/notify?token=${pureToken}`;
    console.log("🌐 [SessionManager] WebSocket 연결 시도:", wsUrl);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("⚠️ [SessionManager] 이미 WebSocket 연결 존재 → 재연결 중단");
      return;
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("✅ [SessionManager] WebSocket 연결 성공");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
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
      console.log("❌ [SessionManager] WebSocket 종료:", event.code, event.reason || "");

      if (event.code === 4001 && event.reason.includes("다른 기기")) {
        console.warn("🚨 WebSocket 종료 사유로 강제 로그아웃 감지됨");
        clearTokens("never");
        setShowForcedLogoutModal(true);
      } else if (event.code !== 1000) {
        console.log("🔁 [SessionManager] WebSocket 재연결 시도 예정 (3초 후)");
        reconnectTimer.current = setTimeout(() => {
          setToken(localStorage.getItem("access_token")); // 트리거
        }, 3000);
      }
    };

    return () => {
      try {
        socket.close(1000, "SessionManager unmount");
      } catch {}
      wsRef.current = null;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [token]);

  // ✅ 로그인 감시 로직 (비로그인 허용 페이지 예외처리)
  useEffect(() => {
    const interval = setInterval(() => {
      const storedToken = localStorage.getItem("access_token");
      const sessionExpiredFlag = localStorage.getItem("session_expired");

      // 🚫 세션 만료 상태는 App.jsx 모달에서 처리
      if (!storedToken && sessionExpiredFlag === "true") return;

      // 🚫 강제 로그아웃 모달이 떠 있을 때는 navigate 중단
      if (showForcedLogoutModal) return;

      // ✅ 비로그인 접근 허용 경로 (prefix 단위로 비교)
      const publicPaths = [
        "/", "/login", "/register", "/find-account",
        "/tutorial", "/social/callback", "/search",
        "/board", "/recipe", "/profile",
        "/ranking", "/users/ranking"
      ];
      const isPublic = publicPaths.some((path) =>
        location.pathname.startsWith(path)
      );

      // ✅ 로그인 필요 페이지에서만 튕기게
      if (!storedToken && !isPublic) {
        console.warn("⚠️ 토큰 없음 → 로그인 페이지로 이동");
        navigate("/login", { replace: true });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [navigate, location.pathname, showForcedLogoutModal]);

  // ✅ 다른 탭 로그아웃 동기화
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
