// src/features/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAndFetchUser, getCurrentUser, clearTokens } from "./api";
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

  /* ✅ 일반 로그인 */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const { tokens } = await loginAndFetchUser(userId, password);
      console.log("✅ 로그인 성공", tokens);
      const user = await getCurrentUser();
      setMsg(`✅ 로그인 성공! 환영합니다, ${user.nickname} (${user.role})`);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("❌ 로그인 후 에러:", err);
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
          {/* ✅ Google */}
          <button
            type="button"
            className="social-btn google"
            onClick={() => handleSocialLogin("google")}
          >
            <img src={googleLogo} alt="Google" className="social-icon" />
            <span>구글 계정으로 로그인</span>
          </button>

          {/* ✅ Naver (SVG 로고) */}
          <button
            type="button"
            className="social-btn naver"
            onClick={() => handleSocialLogin("naver")}
          >
            <div className="naver-logo-area" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Naver"
              >
                <path
                  fill="#FFFFFF"
                  d="M4 4h4.2l7.6 10.8V4H20v16h-4.2L8.2 9.2V20H4z"
                />
              </svg>
            </div>
            <span>네이버 아이디로 로그인</span>
          </button>

          {/* ✅ Kakao */}
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
    </div>
  );
}

export default Login;
