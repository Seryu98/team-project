// src/features/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAndFetchUser, getCurrentUser, clearTokens } from "./api";
import "./Login.css"; // ✅ CSS 분리
import logoImg from "../../shared/assets/logo/logo.png";

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ 자동 로그인 처리
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const user = await getCurrentUser();
        if (user) {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.warn("❌ 자동 로그인 실패:", err);
        clearTokens();
        setMsg("⏰ 세션이 만료되었습니다. 다시 로그인 해주세요.");
      }
    })();
  }, [navigate]);

  // ✅ 로그인 요청
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const { tokens } = await loginAndFetchUser(userId, password);
      console.log("✅ 로그인 성공", tokens);

      const access = localStorage.getItem("access_token");
      const refresh = localStorage.getItem("refresh_token");
      console.log("localStorage access_token:", access);
      console.log("localStorage refresh_token:", refresh);

      if (access) {
        try {
          const payload = JSON.parse(atob(access.split(".")[1]));
          console.log("access_token payload:", payload);
        } catch (err) {
          console.error("❌ access_token 디코딩 실패", err);
        }
      }

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

  return (
    <div className="login-container">
      {/* ✅ 로고 버튼 (메인 이동) */}
      <div className="login-logo" onClick={() => navigate("/")}>
        <img src={logoImg} alt="메인으로 이동" />
      </div>

      <div className="login-box">
        <h2 className="login-title">로그인</h2>

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


        {/* ✅ 회원가입 & 아이디/비번 찾기 링크 */}
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