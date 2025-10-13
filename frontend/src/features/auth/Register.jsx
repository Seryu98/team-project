// src/features/auth/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Modal from "../../components/Modal";
import { register, login } from "./api"; // ✅ login 추가

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    user_id: "",
    password: "",
    name: "",
    nickname: "",
    phone_number: "",
  });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.email || !form.user_id || !form.password || !form.name || !form.nickname) {
      setMsg("❌ 필수 항목을 모두 입력해 주세요.");
      return;
    }

    // ✅ 비밀번호 정규식 검증 추가 (백엔드와 동일 정책)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}$/;
    if (!passwordRegex.test(form.password)) {
      setMsg("❌ 비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. 회원가입
      await register(form);
      
      // 2. 자동 로그인 (기존 login 함수 사용)
      await login(form.user_id, form.password);
      
      setShowDone(true);
    } catch (error) {
      console.error("회원가입/로그인 실패:", error);
      setMsg("❌ 회원가입 실패");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 튜토리얼로 이동
  const goTutorial = () => {
    navigate("/tutorial", {
      replace: true,
    });
  };

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
  };
  const buttonPrimary = {
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
          maxWidth: "520px",
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "28px 24px",
          boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ margin: 0, marginBottom: "16px", textAlign: "center" }}>회원가입</h2>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
          <label style={{ fontSize: "13px" }}>
            이메일<span style={{ color: "#ef4444" }}> *</span>
            <input
              name="email"
              type="email"
              placeholder="example@domain.com"
              value={form.email}
              onChange={handleChange}
              style={{ ...inputStyle, marginTop: "6px" }}
              required
            />
          </label>

          <label style={{ fontSize: "13px" }}>
            아이디<span style={{ color: "#ef4444" }}> *</span>
            <input
              name="user_id"
              placeholder="로그인에 사용할 아이디"
              value={form.user_id}
              onChange={handleChange}
              style={{ ...inputStyle, marginTop: "6px" }}
              required
            />
          </label>

          <label style={{ fontSize: "13px" }}>
            비밀번호<span style={{ color: "#ef4444" }}> *</span>
            <input
              name="password"
              type="password"
              placeholder="영문, 숫자, 특수문자 포함 8~20자"
              value={form.password}
              onChange={handleChange}
              style={{ ...inputStyle, marginTop: "6px" }}
              required
            />
          </label>

          <label style={{ fontSize: "13px" }}>
            이름<span style={{ color: "#ef4444" }}> *</span>
            <input
              name="name"
              placeholder="이름"
              value={form.name}
              onChange={handleChange}
              style={{ ...inputStyle, marginTop: "6px" }}
              required
            />
          </label>

          <label style={{ fontSize: "13px" }}>
            닉네임<span style={{ color: "#ef4444" }}> *</span>
            <input
              name="nickname"
              placeholder="닉네임"
              value={form.nickname}
              onChange={handleChange}
              style={{ ...inputStyle, marginTop: "6px" }}
              required
            />
          </label>

          <label style={{ fontSize: "13px" }}>
            전화번호
            <input
              name="phone_number"
              placeholder="01012345678"
              value={form.phone_number}
              onChange={handleChange}
              style={{ ...inputStyle, marginTop: "6px" }}
            />
          </label>

          <button type="submit" style={buttonPrimary} disabled={submitting}>
            {submitting ? "처리 중..." : "가입하기"}
          </button>
        </form>

        {/* 하단: 로그인 링크만 유지 */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <Link to="/login">이미 계정이 있으신가요? 로그인</Link>
        </div>

        {msg && <p style={{ marginTop: "12px", textAlign: "center" }}>{msg}</p>}
      </div>

      {/* ✅ 튜토리얼로 연결 */}
      {showDone && (
        <Modal
          title="회원가입 완료"
          confirmText="프로필 만들러 가기"
          onConfirm={goTutorial}
          onClose={goTutorial}
        >
          회원가입이 정상적으로 완료되었습니다.
          <br />
          프로필을 만들어볼까요? 🚀
        </Modal>
      )}
    </div>
  );
}

export default Register;