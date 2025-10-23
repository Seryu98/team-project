// src/features/auth/SocialCallback.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal.jsx";

function SocialCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("⏳ 소셜 로그인 처리 중...");
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false); // ✅ 기존 세션 모달 상태

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");
    const isNewUser = urlParams.get("new_user") === "true";  // ✅ 신규 사용자 확인
    const isExistingSession = urlParams.get("existing_session") === "true"; // ✅ 기존 세션 감지 여부

    if (accessToken && refreshToken) {
      // ✅ 토큰 저장
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      // ✅ JWT payload에서 user_id 추출 (웹소켓 연결용)
      try {
        const base64Url = accessToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const decodedData = JSON.parse(atob(base64));
        if (decodedData?.sub) {
          localStorage.setItem("user_id", decodedData.sub);
        }
      } catch (err) {
        console.warn("⚠️ JWT decode 실패:", err);
      }

      // ✅ 기존 세션이 감지된 경우 (다른 기기 로그인)
      if (isExistingSession) {
        console.log("⚠️ 기존 로그인 세션 감지됨");
        setMessage("⚠️ 이미 로그인된 기기가 있습니다.");
        setShowExistingSessionModal(true);
        return; // 아래 이동 로직 중복 방지
      }

      // ✅ 신규 사용자 여부에 따라 메시지 변경
      if (isNewUser) {
        setMessage("🎉 회원가입 완료! 튜토리얼로 이동합니다...");
        console.log("✅ 신규 사용자 - 튜토리얼로 이동");
        
        // ✅ 1초 후 튜토리얼로 이동
        setTimeout(() => {
          navigate("/tutorial", { replace: true });
        }, 1000);
      } else {
        setMessage("✅ 로그인 성공! 메인 페이지로 이동합니다...");
        console.log("✅ 기존 사용자 - 메인으로 이동");
        
        // ✅ 1초 후 메인으로 이동
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1000);
      }
    } else {
      setMessage("❌ 로그인 정보가 없습니다. 다시 시도해주세요.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    }
  }, [navigate]);

  // ✅ 기존 세션 감지 모달 확인 버튼
  const handleConfirm = () => {
    setShowExistingSessionModal(false);
    setMessage("🔄 기존 기기에서 로그아웃 후 로그인 완료!");
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1000);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "120px" }}>
      <h2>{message}</h2>

      {/* ✅ 기존 세션 감지 시 공용 Modal 표시 */}
      {showExistingSessionModal && (
        <Modal
          title="이미 로그인된 기기가 있습니다"
          confirmText="확인"
          onConfirm={handleConfirm}
          onClose={() => setShowExistingSessionModal(false)}
        >
          기존 기기에서 로그아웃 후 새 기기에서 로그인합니다.
          <br />
          계속하시겠습니까?
        </Modal>
      )}
    </div>
  );
}

export default SocialCallback;
