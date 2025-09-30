// src/features/auth/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, getCurrentUser } from "./api";

function Login() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await getCurrentUser();
        navigate("/", { replace: true });
      } catch {
        /* ignore */
      }
    })();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await login(userId, password); // <-- userId 사용
      localStorage.setItem("token", res.access_token);
      const user = await getCurrentUser();
      setMsg(`✅ 로그인 성공! 환영합니다, ${user.nickname} (${user.role})`);
      navigate("/", { replace: true });
    } catch (err) {
      if (String(err?.message || "").includes("423")) {
        setMsg("⏳ 계정이 잠겼습니다. 잠시 후 다시 시도하세요.");
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
          <button type="submit" style={buttonStyle}>로그인</button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
          <Link to="/register">회원가입</Link>
          <Link to="/account/find">아이디/비밀번호 찾기</Link>
        </div>

        {msg && <p style={{ marginTop: "12px", textAlign: "center" }}>{msg}</p>}
      </div>
    </div>
  );
}

export default Login;
