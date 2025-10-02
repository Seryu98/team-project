// src/features/auth/FindAccount.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { findUserId, requestPasswordReset, resetPassword } from "./api";
import "./Login.css"; // 로그인 스타일 재사용

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
      setResult("✅ 비밀번호 재설정 토큰 발급됨 (콘솔 확인)");
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
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setResult("❌ 비밀번호 재설정 실패");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">아이디 / 비밀번호 찾기</h2>

        <div className="login-links">
          <a onClick={() => setMode("id")}>아이디 찾기</a> |{" "}
          <a onClick={() => setMode("reset-request")}>비밀번호 재설정</a>
        </div>

        {mode === "id" && (
          <div className="login-form">
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="전화번호"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button className="login-button" onClick={handleFindId}>
              아이디 찾기
            </button>
          </div>
        )}

        {mode === "reset-request" && (
          <div className="login-form">
            <input
              type="email"
              placeholder="가입한 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="login-button" onClick={handleRequestReset}>
              비밀번호 재설정 요청
            </button>
          </div>
        )}

        {mode === "reset" && (
          <div className="login-form">
            <p className="login-message">
              (테스트용) 발급된 토큰: <br />
              <code>{resetToken}</code>
            </p>
            <input
              type="password"
              placeholder="새 비밀번호"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button className="login-button" onClick={handleResetPassword}>
              비밀번호 재설정
            </button>
          </div>
        )}

        {result && <p className="login-message">{result}</p>}
      </div>
    </div>
  );
}
