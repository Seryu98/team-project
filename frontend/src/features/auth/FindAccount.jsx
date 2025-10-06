// src/features/auth/FindAccount.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [serverCode, setServerCode] = useState("");

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
      setStep(3);
      setResult("");
    } catch {
      setEmailHint("ex******@g****.com");
      setStep(3);
      setResult("⚠️ 서버 연결 전, 임시 이메일 표시 중입니다.");
    }
  };

  // ✅ 3단계 - 인증 메일 발송 (테스트용 코드 생성)
  const handleRequestReset = async () => {
    try {
      const res = await requestPasswordReset(userId);
      setResetToken(res.reset_token);

      // 🚀 실제 이메일 전송 대신 임시 인증번호 생성 (테스트용)
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setServerCode(generatedCode);
      console.log("📨 테스트용 인증번호:", generatedCode);

      setResult("✅ 인증 메일이 발송되었습니다. (테스트용 코드는 콘솔 확인)");
      setTimeout(() => {
        setStep(4);
        setResult("");
      }, 1500);
    } catch {
      setResult("❌ 인증 메일 발송 실패");
    }
  };

  // ✅ 4단계 - 인증번호 검증
  const handleVerifyCode = () => {
    if (verifyCode === serverCode) {
      setResult("✅ 인증 성공! 새 비밀번호를 설정해주세요.");
      setTimeout(() => {
        setStep(5);
        setResult("");
      }, 1000);
    } else {
      setResult("❌ 인증번호가 일치하지 않습니다.");
    }
  };

  // ✅ 비밀번호 규칙 검증
  const validatePassword = (password) => {
    const regex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+~{}:;<>?])[A-Za-z\d!@#$%^&*()_+~{}:;<>?]{8,20}$/;
    return regex.test(password);
  };

  // ✅ 5단계 - 새 비밀번호 설정
  const handleResetPassword = async () => {
    if (!validatePassword(newPassword)) {
      setResult("❌ 비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자로 입력해주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResult("❌ 비밀번호가 일치하지 않습니다.");
      return;
    }

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
