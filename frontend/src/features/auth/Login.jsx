// src/features/auth/Login.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAndFetchUser, getCurrentUser, clearTokens } from "./api";
import Modal from "../../components/Modal"; // ✅ 전역 모달
import "./Login.css";

/* ✅ 로컬 리소스 import */
import logoImg from "../../shared/assets/logo/logo.png";
import googleLogo from "../../shared/assets/social/google.png";
import kakaoLogo from "../../shared/assets/social/kakao.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  /* ✅ 중복 로그인 감지용 모달 상태 */
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  /* ✅ 제재(BAN) 모달 상태 */
  const [banInfo, setBanInfo] = useState(null);

  /* ✅ WebSocket 연결 객체 (강제 로그아웃 감지용) */
  const wsRef = useRef(null);

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

  /* ✅ WebSocket 연결 설정 (강제 로그아웃 감지) */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const wsUrl = API_BASE.replace("http", "ws") + "/ws/notify";
    const ws = new WebSocket(`${wsUrl}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log("🔌 WebSocket 연결됨");
    ws.onclose = () => console.log("❌ WebSocket 연결 종료됨");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "FORCED_LOGOUT") {
          alert(data.message || "다른 기기에서 로그인되어 로그아웃되었습니다.");
          clearTokens();
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.warn("⚠️ WebSocket 메시지 파싱 실패:", err);
      }
    };

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, [navigate]);

  /* ✅ 백엔드에서 /login?ban=... 또는 /login?error=SOCIAL_ERROR 로 리다이렉트된 경우 처리 */
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
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: userId,
          password: password,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // ✅ 409 또는 서버가 중복 세션을 명시한 경우 → 중복 로그인 모달
      if (
        res.status === 409 ||
        data?.existing_session === true ||
        data?.status === "DUPLICATE_SESSION" ||
        (typeof data?.detail === "string" && data.detail.includes("이미 로그인된 기기")) ||
        (typeof data?.message === "string" && data.message.includes("이미 로그인"))
      ) {
        console.warn("⚠️ 중복 로그인 감지:", data);
        setShowDuplicateModal(true);
        return;
      }

      // ✅ 에러 응답에서 BAN 정보가 포함된 경우 → BAN 모달
      if (!res.ok) {
        // FastAPI의 detail이 문자열 JSON일 수 있음 → 파싱 시도
        let detail = data?.detail ?? data?.message ?? null;
        try {
          if (typeof detail === "string") {
            const maybeObj = JSON.parse(detail);
            detail = maybeObj;
          }
        } catch {
          /* 문자열이면 그대로 둠 */
        }

        if (detail && (detail.type === "TEMP_BAN" || detail.type === "PERM_BAN")) {
          setBanInfo(detail);
          return;
        }

        throw new Error(
          (typeof detail === "string" && detail) || "로그인 실패"
        );
      }

      // ✅ 정상 로그인 처리
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // ✅ WebSocket 재연결 (로그인 후)
      try {
        if (wsRef.current) wsRef.current.close();
      } catch {}
      const wsUrl = API_BASE.replace("http", "ws") + "/ws/notify";
      wsRef.current = new WebSocket(`${wsUrl}?token=${data.access_token}`);

      const user = await getCurrentUser();
      setMsg(`✅ 로그인 성공! 환영합니다, ${user.nickname} (${user.role})`);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ 로그인 에러:", err);

      const message = String(err?.message || "");
      if (message.includes("423")) {
        setMsg("⏳ 계정이 잠겼습니다. 잠시 후 다시 시도하세요.");
      } else if (message.includes("세션 만료")) {
        setMsg("⏰ 세션이 만료되었습니다. 다시 로그인 해주세요.");
        clearTokens();
      } else {
        setMsg("❌ 로그인 실패");
      }
    }
  };

  /* ✅ 강제 로그인 (기존 세션 무효화 후 로그인) */
  const handleForceLogin = async () => {
    setShowDuplicateModal(false);
    try {
      const res = await fetch(`${API_BASE}/auth/force-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: userId,
          password: password,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        // 강제 로그인에서도 BAN 가능 → 파싱 동일 적용
        let detail = data?.detail ?? data?.message ?? null;
        try {
          if (typeof detail === "string") {
            detail = JSON.parse(detail);
          }
        } catch {}
        if (detail && (detail.type === "TEMP_BAN" || detail.type === "PERM_BAN")) {
          setBanInfo(detail);
          return;
        }
        throw new Error((typeof detail === "string" && detail) || "강제 로그인 실패");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      // ✅ WebSocket 재연결 (강제 로그인 후)
      try {
        if (wsRef.current) wsRef.current.close();
      } catch {}
      const wsUrl = API_BASE.replace("http", "ws") + "/ws/notify";
      wsRef.current = new WebSocket(`${wsUrl}?token=${data.access_token}`);

      const user = await getCurrentUser();
      setMsg(`✅ 로그인 성공! 환영합니다, ${user.nickname} (${user.role})`);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ 강제 로그인 에러:", err);
      setMsg("⚠️ 강제 로그인 중 오류가 발생했습니다.");
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

      {/* ✅ 중복 로그인 모달 */}
      {showDuplicateModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>이미 로그인된 계정입니다.</h3>
            <p>
              다른 기기에서 로그인된 세션이 있습니다.
              <br />
              이 기기에서 로그인하시겠습니까?
            </p>
            <div className="modal-buttons">
              <button onClick={() => setShowDuplicateModal(false)}>취소</button>
              <button onClick={handleForceLogin}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 제재 모달 */}
      {banInfo && (
        <Modal
          title="🚫 제재된 계정"
          confirmText="확인"
          onConfirm={() => setBanInfo(null)}
        >
          <p style={{ marginBottom: "8px" }}>{banInfo.message}</p>

          {banInfo.type === "TEMP_BAN" && banInfo.remaining && (
            <p style={{ color: "#2563eb", fontWeight: 600 }}>
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
    </div>
  );
}

export default Login;
