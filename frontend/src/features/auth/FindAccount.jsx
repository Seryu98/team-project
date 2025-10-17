// src/features/auth/FindAccount.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  findUserId,
  requestPasswordReset,
  resetPassword,
  getEmailHint,
} from "./api";
import logo from "../../shared/assets/logo/logo.png";
import "./Login.css";

export default function FindAccount() {
  const navigate = useNavigate();

  // ✅ 단계 흐름
  // 1=아이디 찾기 → 2=아이디 입력 → 3=이메일 인증 → 4=인증번호 입력 → 5=비밀번호 재설정
  const [step, setStep] = useState(1);

  // --- 입력 데이터 ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [emailHint, setEmailHint] = useState("");

  // --- 인증 관련 ---
  const [resetToken, setResetToken] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [emailForReset, setEmailForReset] = useState("");

  // --- 새 비밀번호 ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- 결과 메시지 ---
  const [result, setResult] = useState("");

  // ✅ 1단계 - 아이디 찾기
  const handleFindId = async () => {
    try {
      const res = await findUserId(name, phone);
      setUserId(res.user_id);
      setResult(`✅ 회원 아이디: ${res.user_id}`);

      setTimeout(() => {
        setStep(2);
        setResult("");
      }, 2000);
    } catch {
      setResult("❌ 등록된 정보가 없습니다.");
    }
  };

  // ✅ 2단계 - 아이디 입력 후 이메일 조회
  const handleNextToEmail = async () => {
    if (!userId.trim()) {
      setResult("❌ 아이디를 입력해주세요.");
      return;
    }

    try {
      const res = await getEmailHint(userId);
      setEmailHint(res.email_hint);
      setEmailForReset(res.email); // 실제 이메일 저장
      setStep(3);
      setResult("");
    } catch {
      setEmailHint("ex******@g****.com");
      setStep(3);
      setResult("⚠️ 서버 연결 전, 임시 이메일 표시 중입니다.");
    }
  };

  // ✅ 3단계 - 인증 메일 발송 (백엔드 요청)
  const handleRequestReset = async () => {
    try {
      // ✅ 백엔드 요구사항: email + purpose ("reset")
      await axios.post("http://localhost:8000/auth/email/send-code", {
        email: emailForReset,
        purpose: "reset", // ← 필수 추가
      });

      setResult("✅ 인증 메일이 발송되었습니다. 이메일을 확인해주세요.");
      setTimeout(() => {
        setStep(4);
        setResult("");
      }, 1500);
    } catch (error) {
      console.error("비밀번호 재설정 인증 메일 실패:", error);

      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        setResult("❌ " + detail.map((d) => d.msg).join(", "));
      } else if (typeof detail === "string") {
        setResult("❌ " + detail);
      } else {
        setResult("❌ 인증 메일 발송 중 오류가 발생했습니다.");
      }
    }
  };

  // ✅ 4단계 - 인증번호 검증 (백엔드 요청)
  const handleVerifyCode = async () => {
    if (!verifyCode.trim()) {
      setResult("❌ 인증번호를 입력해주세요.");
      return;
    }

    try {
      // ✅ 백엔드 요구사항: email + code + purpose
      await axios.post("http://localhost:8000/auth/email/verify-code", {
        email: emailForReset,
        code: verifyCode,
        purpose: "reset",
      });

      // ✅ 인증 성공 후 비밀번호 재설정용 토큰 발급
      const res = await axios.post("http://localhost:8000/auth/request-password-reset", {
        user_id: userId,
      });

      if (res.data.reset_token) {
        setResetToken(res.data.reset_token); // ✅ 토큰 저장
        console.log("✅ 발급받은 reset_token:", res.data.reset_token);
      }

      setResult("✅ 인증 성공! 새 비밀번호를 설정해주세요.");
      setTimeout(() => {
        setStep(5);
        setResult("");
      }, 1000);
    } catch (error) {
      console.error("인증 실패:", error);
      setResult("❌ 인증번호가 올바르지 않습니다.");
    }
  };

  // ✅ 비밀번호 규칙 검증 (백엔드와 동일한 정규식)
  const validatePassword = (password) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,20}$/;
    return regex.test(password);
  };

  // ✅ 5단계 - 새 비밀번호 설정
  const handleResetPassword = async () => {
    if (!validatePassword(newPassword)) {
      setResult("❌ 비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResult("❌ 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      console.log("🔑 reset_token:", resetToken);
      await resetPassword(resetToken, newPassword);
      setResult("✅ 비밀번호 재설정 완료! 다시 로그인하세요.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("비밀번호 재설정 실패:", error);
      setResult("❌ 비밀번호 재설정 실패");
    }
  };

  return (
    <div className="login-container">
      {/* 상단 로고 */}
      <div className="login-logo" onClick={() => navigate("/")}>
        <img src={logo} alt="ITDA Logo" />
      </div>

      <div className="login-box">
        <h2 className="login-title">아이디 / 비밀번호 찾기</h2>

        {/* 상단 탭 */}
        <div className="tab-menu">
          <button
            className={`tab ${step === 1 ? "active" : ""}`}
            onClick={() => setStep(1)}
          >
            아이디 찾기
          </button>
          <button
            className={`tab ${step > 1 ? "active" : ""}`}
            onClick={() => setStep(2)}
          >
            비밀번호 찾기
          </button>
        </div>

        {/* ✅ 1단계: 아이디 찾기 */}
        {step === 1 && (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleFindId();
            }}
          >
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="전화번호"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button type="submit" className="login-button">
              다음
            </button>
          </form>
        )}

        {/* ✅ 2단계: 아이디 입력 */}
        {step === 2 && (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleNextToEmail();
            }}
          >
            <input
              type="text"
              placeholder="가입한 아이디"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <button type="submit" className="login-button">
              다음
            </button>
          </form>
        )}

        {/* ✅ 3단계: 이메일 인증 */}
        {step === 3 && (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleRequestReset();
            }}
          >
            <p className="login-message">비밀번호를 찾을 방법을 선택해주세요.</p>
            <div className="email-auth-box">
              <label>
                <input type="radio" checked readOnly />
                본인확인 이메일 인증{" "}
                <span className="email-hint">({emailHint})</span>
              </label>
            </div>
            <button type="submit" className="login-button">
              인증 메일 발송
            </button>
          </form>
        )}

        {/* ✅ 4단계: 인증번호 입력 */}
        {step === 4 && (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyCode();
            }}
          >
            <p className="login-message">이메일로 받은 6자리 인증번호를 입력해주세요.</p>
            <input
              type="text"
              placeholder="인증번호 입력"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              maxLength={6}
            />
            <button type="submit" className="login-button">
              인증하기
            </button>
          </form>
        )}

        {/* ✅ 5단계: 새 비밀번호 설정 */}
        {step === 5 && (
          <form
            className="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleResetPassword();
            }}
          >
            <input
              type="password"
              placeholder="새 비밀번호 (영문, 숫자, 특수문자 포함 8~20자)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button type="submit" className="login-button">
              비밀번호 재설정
            </button>
          </form>
        )}

        {/* 결과 메시지 */}
        {result && <p className="login-message">{result}</p>}
      </div>
    </div>
  );
}
