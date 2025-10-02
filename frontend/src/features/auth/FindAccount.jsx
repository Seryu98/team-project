// src/features/auth/FindAccount.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findUserId, requestPasswordReset, resetPassword } from "./api";

export default function FindAccount() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("id"); // "id" | "reset-request" | "reset"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [result, setResult] = useState("");

  // 아이디 찾기
  const handleFindId = async () => {
    try {
      const res = await findUserId(name, phone);
      setResult(`✅ 회원 아이디: ${res.user_id}`);
    } catch (err) {
      setResult("❌ 등록된 정보가 없습니다.");
    }
  };

  // 비밀번호 재설정 요청
  const handleRequestReset = async () => {
    try {
      const res = await requestPasswordReset(email);
      setResetToken(res.reset_token); // 🚩 테스트 단계에서는 화면에 표시
      setResult("✅ 비밀번호 재설정 토큰 발급됨 (테스트용 콘솔 확인)");
      console.log("reset_token:", res.reset_token);
      setMode("reset");
    } catch {
      setResult("❌ 비밀번호 재설정 요청 실패");
    }
  };

  // 비밀번호 재설정 실행
  const handleResetPassword = async () => {
    try {
      await resetPassword(resetToken, newPassword);
      setResult("✅ 비밀번호 재설정 완료! 다시 로그인하세요.");
      // 2초 후 로그인 페이지로 이동
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setResult("❌ 비밀번호 재설정 실패");
    }
  };

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    margin: "6px 0",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  };

  const buttonStyle = {
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h2>아이디 / 비밀번호 찾기</h2>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setMode("id")}>아이디 찾기</button>
        <button onClick={() => setMode("reset-request")}>비밀번호 재설정</button>
      </div>

      {mode === "id" && (
        <div>
          <input
            style={inputStyle}
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="전화번호"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button style={buttonStyle} onClick={handleFindId}>
            아이디 찾기
          </button>
        </div>
      )}

      {mode === "reset-request" && (
        <div>
          <input
            style={inputStyle}
            placeholder="가입한 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button style={buttonStyle} onClick={handleRequestReset}>
            비밀번호 재설정 요청
          </button>
        </div>
      )}

      {mode === "reset" && (
        <div>
          <p style={{ fontSize: "12px", color: "#555" }}>
            (테스트용) 발급된 토큰: <br />
            <code>{resetToken}</code>
          </p>
          <input
            style={inputStyle}
            type="password"
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button style={buttonStyle} onClick={handleResetPassword}>
            비밀번호 재설정
          </button>
        </div>
      )}

      {result && <p style={{ marginTop: 20 }}>{result}</p>}
    </div>
  );
}
