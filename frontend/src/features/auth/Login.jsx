// src/features/auth/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAndFetchUser, getCurrentUser, clearTokens } from "./api";

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // 이미 로그인된 상태면 메인으로
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

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  };
  const buttonStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f7fb",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "28px 24px",
          boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: "16px", textAlign: "center" }}>로그인</h2>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
          <input
            type="text"
            placeholder="아이디"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={inputStyle}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
          />
          <button type="submit" style={buttonStyle}>
            로그인
          </button>
        </form>

        {/* ✅ 회원가입 & 아이디/비번 찾기 링크 */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
          <Link to="/register">회원가입</Link>
          <Link to="/find-account">아이디/비밀번호 찾기</Link>
        </div>

        {msg && <p style={{ marginTop: "12px", textAlign: "center" }}>{msg}</p>}
      </div>
    </div>
  );
}

export default Login;
