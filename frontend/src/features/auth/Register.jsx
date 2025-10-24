// src/features/auth/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Modal from "../../components/Modal";
import { register, login } from "./api";
import axios from "axios";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    user_id: "",
    password: "",
    passwordConfirm: "",
    name: "",
    nickname: "",
    phone_number: "",
  });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [idCheckMsg, setIdCheckMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [isIdChecked, setIsIdChecked] = useState(false);

  // ✅ 이메일 유효성 검증 상태
  const [emailCheckMsg, setEmailCheckMsg] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);

  // ✅ 전화번호 중복확인 상태
  const [phoneCheckMsg, setPhoneCheckMsg] = useState("");
  const [isPhoneChecked, setIsPhoneChecked] = useState(false);

  // ✅ 이메일 인증 모달 상태
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // ✅ 입력 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "password" || name === "passwordConfirm") {
      const nextPassword = name === "password" ? value : form.password;
      const nextConfirm =
        name === "passwordConfirm" ? value : form.passwordConfirm;
      if (nextConfirm.length > 0) {
        setPasswordMatch(nextPassword === nextConfirm);
      } else {
        setPasswordMatch(true);
      }
    }

    if (name === "user_id") {
      setIsIdChecked(false);
      setIdCheckMsg("");
    }

    if (name === "email") {
      setEmailCheckMsg("");
      setIsEmailValid(false);
    }

    if (name === "phone_number") {
      setPhoneCheckMsg("");
      setIsPhoneChecked(false);
    }
  };

  // ✅ 이메일 인증 코드 발송
  const handleEmailCheck = async () => {
    if (!form.email) {
      setEmailCheckMsg("⚠️ 이메일을 입력해주세요.");
      setIsEmailValid(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setEmailCheckMsg("❌ 올바른 이메일 형식을 입력해주세요.");
      setIsEmailValid(false);
      return;
    }
    try {
      await axios.post("http://localhost:8000/auth/email/send-code", {
        email: form.email,
        purpose: "signup",
      });
      setShowEmailModal(true);
      setEmailCheckMsg("✉️ 인증코드가 이메일로 전송되었습니다.");
    } catch (error) {
      console.error("이메일 발송 실패:", error);
      if (error.response?.data?.detail) {
        setEmailCheckMsg(`❌ ${error.response.data.detail}`);
      } else {
        setEmailCheckMsg("❌ 이메일 발송 중 문제가 발생했습니다.");
      }
      setIsEmailValid(false);
    }
  };

  // ✅ 이메일 인증 코드 확인
  const handleVerifyEmailCode = async (codeFromModal) => {
    try {
      const codeToUse = codeFromModal || verificationCode;
      await axios.post("http://localhost:8000/auth/email/verify-code", {
        email: form.email,
        code: codeToUse,
        purpose: "signup",
      });
      setIsEmailValid(true);
      setShowEmailModal(false);
      setEmailCheckMsg("✅ 이메일 인증이 완료되었습니다.");
    } catch (error) {
      console.error("인증코드 검증 실패:", error);
      setEmailCheckMsg("❌ 인증코드가 올바르지 않습니다.");
    }
  };

  // ✅ 아이디 중복확인
  const handleIdCheck = async () => {
    if (!form.user_id) {
      setIdCheckMsg("⚠️ 아이디를 입력해주세요.");
      setIsIdChecked(false);
      return;
    }
    try {
      const res = await axios.get(
        `http://localhost:8000/auth/check-id?user_id=${form.user_id}`
      );
      setIdCheckMsg(res.data.message);
      setIsIdChecked(true);
    } catch (error) {
      setIdCheckMsg(
        error.response?.data?.detail || "❌ 아이디 중복 확인 중 오류 발생"
      );
      setIsIdChecked(false);
    }
  };

  // ✅ 전화번호 중복확인
  const handlePhoneCheck = async () => {
    if (!form.phone_number) {
      setPhoneCheckMsg("⚠️ 전화번호를 입력해주세요.");
      setIsPhoneChecked(false);
      return;
    }
    try {
      const res = await axios.get(
        `http://localhost:8000/auth/check-phone?phone_number=${form.phone_number}`
      );
      setPhoneCheckMsg(res.data.message);
      setIsPhoneChecked(res.data.available);
    } catch (error) {
      setPhoneCheckMsg(
        error.response?.data?.detail || "❌ 전화번호 중복 확인 중 오류 발생"
      );
      setIsPhoneChecked(false);
    }
  };

  // ✅ 회원가입 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    localStorage.clear();
    sessionStorage.clear();

    if (!isEmailValid) {
      setMsg("❌ 이메일 인증을 완료해주세요.");
      return;
    }

    if (!isIdChecked) {
      setMsg("❌ 아이디 중복확인을 해주세요.");
      return;
    }

    if (form.phone_number && !isPhoneChecked) {
      setMsg("❌ 전화번호 중복확인을 해주세요.");
      return;
    }

    if (
      !form.email ||
      !form.user_id ||
      !form.password ||
      !form.passwordConfirm ||
      !form.name ||
      !form.nickname
    ) {
      setMsg("❌ 필수 항목을 모두 입력해 주세요.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}$/;
    if (!passwordRegex.test(form.password)) {
      setMsg("❌ 비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.");
      return;
    }

    if (!passwordMatch) {
      setMsg("❌ 비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      const loginRes = await login(form.user_id, form.password);
      if (loginRes?.access_token && loginRes?.refresh_token) {
        localStorage.setItem("access_token", loginRes.access_token);
        localStorage.setItem("refresh_token", loginRes.refresh_token);
      }
      setShowDone(true);
    } catch (error) {
      console.error("회원가입 실패:", error);
      const detail =
        error.response?.data?.detail || error.message || "회원가입 실패";
      setMsg(`❌ ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const goTutorial = () => {
    navigate("/tutorial", { replace: true });
  };

  // 스타일
  const inputStyle = {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    width: "100%",
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
        <h2 style={{ margin: 0, marginBottom: "16px", textAlign: "center" }}>
          회원가입
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "10px" }}>
          {/* 이메일 */}
          <label style={{ fontSize: "13px" }}>
            이메일<span style={{ color: "#ef4444" }}> *</span>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <input
                name="email"
                type="email"
                placeholder="example@domain.com"
                value={form.email}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={handleEmailCheck}
                disabled={isEmailValid}
                style={{
                  ...buttonPrimary,
                  background: isEmailValid ? "#9ca3af" : "#4b5563",
                  cursor: isEmailValid ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  padding: "10px 14px",
                }}
              >
                {isEmailValid ? "인증완료" : "이메일확인"}
              </button>
            </div>
            {emailCheckMsg && (
              <p
                style={{
                  fontSize: "12px",
                  color: emailCheckMsg.includes("완료") ? "green" : "red",
                  marginTop: "4px",
                }}
              >
                {emailCheckMsg}
              </p>
            )}
          </label>

          {/* 아이디 */}
          <label style={{ fontSize: "13px" }}>
            아이디<span style={{ color: "#ef4444" }}> *</span>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <input
                name="user_id"
                placeholder="로그인에 사용할 아이디"
                value={form.user_id}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={handleIdCheck}
                style={{
                  ...buttonPrimary,
                  background: "#4b5563",
                  whiteSpace: "nowrap",
                  padding: "10px 14px",
                }}
              >
                중복확인
              </button>
            </div>
            {idCheckMsg && (
              <p
                style={{
                  fontSize: "12px",
                  color: idCheckMsg.includes("가능") ? "green" : "red",
                  marginTop: "4px",
                }}
              >
                {idCheckMsg}
              </p>
            )}
          </label>

          {/* 비밀번호 */}
          <label style={{ fontSize: "13px" }}>
            비밀번호<span style={{ color: "#ef4444" }}> *</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "6px",
              }}
            >
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="영문, 숫자, 특수문자 포함 8~20자"
                value={form.password}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </label>

          {/* 비밀번호 확인 */}
          <label style={{ fontSize: "13px" }}>
            비밀번호 확인<span style={{ color: "#ef4444" }}> *</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "6px",
              }}
            >
              <input
                name="passwordConfirm"
                type={showPasswordConfirm ? "text" : "password"}
                placeholder="비밀번호를 다시 입력해주세요"
                value={form.passwordConfirm}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswordConfirm(!showPasswordConfirm)
                }
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                {showPasswordConfirm ? "🙈" : "👁"}
              </button>
            </div>
            {form.passwordConfirm.length > 0 && !passwordMatch && (
              <p style={{ fontSize: "12px", color: "red", marginTop: "4px" }}>
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </label>

          {/* 이름 */}
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

          {/* 닉네임 */}
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

          {/* 전화번호 + 중복확인 */}
          <label style={{ fontSize: "13px" }}>
            전화번호<span style={{ color: "#ef4444" }}> *</span>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <input
                name="phone_number"
                placeholder="01012345678"
                value={form.phone_number}
                onChange={handleChange}
                style={{ ...inputStyle, flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={handlePhoneCheck}
                style={{
                  ...buttonPrimary,
                  background: "#4b5563",
                  whiteSpace: "nowrap",
                  padding: "10px 14px",
                }}
              >
                중복확인
              </button>
            </div>
            {phoneCheckMsg && (
              <p
                style={{
                  fontSize: "12px",
                  color: phoneCheckMsg.includes("가능") ? "green" : "red",
                  marginTop: "4px",
                }}
              >
                {phoneCheckMsg}
              </p>
            )}
          </label>


          <button type="submit" style={buttonPrimary} disabled={submitting}>
            {submitting ? "처리 중..." : "가입하기"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "12px",
          }}
        >
          <Link to="/login">이미 계정이 있으신가요? 로그인</Link>
        </div>

        {msg && (
          <p style={{ marginTop: "12px", textAlign: "center", color: "#ef4444" }}>
            {msg}
          </p>
        )}
      </div>

      {/* 이메일 인증 모달 */}
      {showEmailModal && (
        <Modal
          title="이메일 인증"
          confirmText="확인"
          onConfirm={handleVerifyEmailCode}
          onClose={() => setShowEmailModal(false)}
        >
          이메일로 전송된 인증코드를 입력해주세요.
        </Modal>
      )}

      {/* 가입 완료 모달 */}
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
