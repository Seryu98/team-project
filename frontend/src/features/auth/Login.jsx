// src/features/auth/Login.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAndFetchUser, getCurrentUser, clearTokens } from "./api";
import Modal from "../../components/Modal"; // ✅ 전역 모달 불러오기
import "./Login.css";

/* ✅ 로컬 리소스 import */
import logoImg from "../../shared/assets/logo/logo.png";
import googleLogo from "../../shared/assets/social/google.png";
import kakaoLogo from "../../shared/assets/social/kakao.png";

// ✅ 둘 중 하나만 세팅되어 있어도 동작하도록 병합
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8000";

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ [추가] 제재 모달 상태
  const [banInfo, setBanInfo] = useState(null);

  // ✅ [추가] 단일 로그인 관련 상태
  const [forceLogout, setForceLogout] = useState(false);
  const wsRef = useRef(null);

  // ✅ [중복 로그인 관련 추가]
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

  /* ✅ 자동 로그인 */
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const user = await getCurrentUser();
        if (user) navigate("/", { replace: true });
      } catch (err) {
        console.warn("❌ 자동 로그인 실패:", err);
        clearTokens();
        setMsg("⏰ 세션이 만료되었습니다. 다시 로그인 해주세요.");
      }
    })();
  }, [navigate]);

  /* ✅ [추가됨] 백엔드에서 /login?ban=... 으로 리다이렉트된 경우 모달 자동 표시 */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const banParam = params.get("ban");
    const errorParam = params.get("error");

    if (banParam) {
      try {
        const info = JSON.parse(decodeURIComponent(banParam));
        setBanInfo(info);
      } catch (err) {
        console.error("제재 정보 파싱 실패:", err);
      }
      // URL 정리 (뒤로가기 시 다시 모달 안 뜨게)
      window.history.replaceState({}, document.title, "/login");
      return;
    }

    if (errorParam === "SOCIAL_ERROR") {
      setMsg("⚠️ 소셜 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      window.history.replaceState({}, document.title, "/login");
    }
  }, []);

  /* ✅ 일반 로그인 */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const { tokens } = await loginAndFetchUser(userId, password);
      console.log("✅ 로그인 성공", tokens);
      const user = await getCurrentUser();
      setMsg(`✅ 로그인 성공! 환영합니다, ${user.nickname} (${user.role})`);

      // ✅ [추가] WebSocket 연결 시작
      initWebSocket(user.id);

      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ 로그인 후 에러:", err);

      let detail = null;

      try {
        // ✅ 1️⃣ 기본 FastAPI 객체 응답
        if (err.response?.data?.detail) {
          const raw = err.response.data.detail;

          // ✅ 2️⃣ detail이 문자열 형태의 JSON이라면, 한 번 더 파싱
          if (typeof raw === "string") {
            try {
              detail = JSON.parse(raw);
            } catch {
              detail = raw; // 단순 문자열이면 그대로 사용
            }
          } else {
            detail = raw; // 이미 객체일 경우 그대로
          }

          // ✅ 3️⃣ 문자열 전체 JSON일 때
        } else if (typeof err.response?.data === "string") {
          const parsed = JSON.parse(err.response.data);
          detail = parsed?.detail;
          if (typeof detail === "string") detail = JSON.parse(detail); // 🔥 이중 파싱 핵심
        }
      } catch (parseErr) {
        console.warn("🚫 detail 파싱 실패:", parseErr);
      }

      console.log("🧩 최종 파싱된 detail:", detail);

      // ✅ TEMP_BAN / PERM_BAN → 모달 표시
      if (detail && (detail.type === "TEMP_BAN" || detail.type === "PERM_BAN")) {
        console.log("🚨 제재 감지됨 → 모달 표시", detail);
        setBanInfo(detail);
        return;
      }

      // ✅ [중복 로그인 관련 추가] 서버에서 이미 로그인된 세션 감지 시
      if (err.response?.status === 409 || String(detail)?.includes("이미 로그인")) {
        console.log("⚠️ 이미 로그인된 세션 감지 → 확인 모달 표시");
        setPendingLoginData({ userId, password });
        setShowConflictModal(true);
        return;
      }

      // ✅ 나머지 에러 처리
      const message = String(err?.message || "");
      if (message.includes("423")) {
        setMsg("⏳ 계정이 잠겼습니다. 잠시 후 다시 시도하세요.");
      } else if (message.includes("세션 만료")) {
        setMsg("⏰ 세션이 만료되었습니다. 다시 로그인 해주세요.");
        clearTokens();
      } else if (err.response?.status === 403) {
        setMsg("🚫 접근이 제한된 계정입니다. 관리자에게 문의하세요.");
      } else {
        setMsg("❌ 로그인 실패");
      }
    }
  };

  // ✅ [중복 로그인 관련 추가] “확인” 눌렀을 때 강제 로그인 수행
  const handleForceLogin = async () => {
    try {
      const { userId, password } = pendingLoginData;

      // ✅ 백엔드에 강제 로그인 요청 (force=true)
      const { tokens } = await loginAndFetchUser(userId, password, true);
      console.log("✅ 강제 로그인 성공", tokens);

      const user = await getCurrentUser();
      initWebSocket(user.id);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ 강제 로그인 실패:", err);
      setMsg("❌ 강제 로그인 실패. 다시 시도해주세요.");
    } finally {
      setShowConflictModal(false);
    }
  };

  /* ✅ 단일 로그인용 WebSocket 연결 로직 */
  const initWebSocket = (userId) => {
    try {
      const ws = new WebSocket(`${API_BASE.replace("http", "ws")}/notifications/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("📡 WebSocket 연결됨:", userId);
        ws.send(JSON.stringify({ type: "PING" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("💬 WebSocket 수신:", data);

          // ✅ 서버/클라이언트 모두 대응: FORCE_LOGOUT 또는 FORCED_LOGOUT
          if (data.type === "FORCED_LOGOUT" || data.type === "FORCE_LOGOUT") {
            console.warn("🚨 다른 기기에서 로그인됨 → 자동 로그아웃 실행");
            // ✅ clearTokens() 즉시 실행 금지 → 모달 먼저 표시
            setForceLogout(true);
          }
        } catch (err) {
          console.error("WebSocket 메시지 파싱 오류:", err);
        }
      };

      ws.onclose = (e) => {
        console.log("🔌 WebSocket 연결 종료:", e.reason || e.code);
      };

      ws.onerror = (err) => {
        console.error("⚠️ WebSocket 오류:", err);
      };
    } catch (err) {
      console.error("❌ WebSocket 초기화 실패:", err);
    }
  };

  /* ✅ 소셜 로그인 */
  const handleSocialLogin = (provider) => {
    window.location.href = `${API_BASE}/auth/social/login/${provider}`;
  };

  return (
    <div className="login-container">
      {/* 상단 로고 */}
      <div className="login-logo" onClick={() => navigate("/")}>
        <img src={logoImg} alt="메인으로 이동" />
      </div>

      <div className="login-box">
        <h2 className="login-title">로그인</h2>

        {/* 일반 로그인 */}
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="아이디"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" className="login-button">
            로그인
          </button>
        </form>

        {/* 구분선 */}
        <div className="divider">
          <span>또는</span>
        </div>

        {/* ✅ 소셜 로그인 */}
        <div className="social-login">
          <button
            type="button"
            className="social-btn google"
            onClick={() => handleSocialLogin("google")}
          >
            <img src={googleLogo} alt="Google" className="social-icon" />
            <span>구글 계정으로 로그인</span>
          </button>

          <button
            type="button"
            className="social-btn naver"
            onClick={() => handleSocialLogin("naver")}
          >
            <div className="naver-logo-area" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="Naver">
                <path
                  fill="#FFFFFF"
                  d="M4 4h4.2l7.6 10.8V4H20v16h-4.2L8.2 9.2V20H4z"
                />
              </svg>
            </div>
            <span>네이버 아이디로 로그인</span>
          </button>

          <button
            type="button"
            className="social-btn kakao"
            onClick={() => handleSocialLogin("kakao")}
          >
            <img src={kakaoLogo} alt="Kakao" className="social-icon" />
            <span>카카오 계정으로 로그인</span>
          </button>
        </div>

        {/* 하단 링크 */}
        <div className="login-links">
          <Link to="/register">회원가입</Link>
          <Link to="/find-account">아이디/비밀번호 찾기</Link>
        </div>

        {msg && <p className="login-message">{msg}</p>}
      </div>

      {/* ✅ 제재 모달 표시 */}
      {banInfo && (
        <Modal
          title="🚫 제재된 계정"
          confirmText="확인"
          onConfirm={() => setBanInfo(null)}
        >
          <p style={{ marginBottom: "8px" }}>{banInfo.message}</p>

          {banInfo.type === "TEMP_BAN" && banInfo.remaining && (
            <p style={{ color: "#2563eb", fontWeight: "600" }}>
              남은 시간:{" "}
              {banInfo.remaining.days > 0 && `${banInfo.remaining.days}일 `}
              {banInfo.remaining.hours > 0 && `${banInfo.remaining.hours}시간 `}
              {banInfo.remaining.minutes > 0 && `${banInfo.remaining.minutes}분`}
            </p>
          )}

          <p style={{ marginTop: "10px", fontSize: "14px", color: "#6b7280" }}>
            문의: <b>support@solmatching.com</b>
          </p>
        </Modal>
      )}

      {/* ✅ 단일 로그인 감지 모달 */}
      {forceLogout && (
        <Modal
          title="⚠️ 중복 로그인 감지"
          confirmText="확인"
          onConfirm={() => {
            clearTokens();
            setForceLogout(false);
            navigate("/login", { replace: true });
          }}
        >
          <p>다른 기기에서 로그인되어 현재 세션이 종료되었습니다.</p>
        </Modal>
      )}

      {/* ✅ [중복 로그인 관련 추가] 새 로그인 시 확인 모달 */}
      {showConflictModal && (
        <Modal
          title="중복 로그인 감지"
          confirmText="확인"
          cancelText="취소"
          onConfirm={handleForceLogin}
          onClose={() => setShowConflictModal(false)}
        >
          <p>이미 로그인된 세션이 있습니다. 이 기기에서 로그인하시겠습니까?</p>
        </Modal>
      )}
    </div>
  );
}

export default Login;
