// src/features/auth/SocialCallback.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal.jsx";

function SocialCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("⏳ 소셜 로그인 처리 중...");
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false); // ✅ 기존 세션 모달
  const [banInfo, setBanInfo] = useState(null); // ✅ 제재 모달

  useEffect(() => {
    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get("access_token");
        const refreshToken = urlParams.get("refresh_token");
        const isNewUser = urlParams.get("new_user") === "true";
        const isExistingSession = urlParams.get("existing_session") === "true";

        // 🚫 access_token 없음 → 서버에서 에러 리다이렉트된 경우
        if (!accessToken || !refreshToken) {
          const errorParam = urlParams.get("error");
          if (errorParam) {
            try {
              const detail = JSON.parse(decodeURIComponent(errorParam));
              if (detail.type === "TEMP_BAN" || detail.type === "PERM_BAN") {
                setBanInfo(detail);
                return;
              }
            } catch (e) {
              console.warn("⚠️ 에러 파라미터 파싱 실패:", e);
            }
          }

          setMessage("❌ 로그인 정보가 없습니다. 다시 시도해주세요.");
          setTimeout(() => navigate("/login", { replace: true }), 1500);
          return;
        }

        // ✅ JWT payload에서 user_id 추출 (웹소켓용 등)
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

        // ✅ 정상 로그인 토큰 저장
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);

        // ✅ 기존 세션 감지 시
        if (isExistingSession) {
          console.log("⚠️ 기존 로그인 세션 감지됨");
          setMessage("⚠️ 이미 로그인된 기기가 있습니다.");
          setShowExistingSessionModal(true);
          return;
        }

        // ✅ 신규 사용자 / 기존 사용자 구분
        if (isNewUser) {
          setMessage("🎉 회원가입 완료! 튜토리얼로 이동합니다...");
          console.log("✅ 신규 사용자 - 튜토리얼로 이동");
          setTimeout(() => navigate("/tutorial", { replace: true }), 1000);
        } else {
          setMessage("✅ 로그인 성공! 메인 페이지로 이동합니다...");
          console.log("✅ 기존 사용자 - 메인으로 이동");
          setTimeout(() => navigate("/", { replace: true }), 1000);
        }
      } catch (err) {
        console.error("❌ 소셜 로그인 처리 중 오류:", err);
        setMessage("⚠️ 로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    })();
  }, [navigate]);

  // ✅ 기존 세션 모달 확인
  const handleConfirm = () => {
    setShowExistingSessionModal(false);
    setMessage("🔄 기존 기기에서 로그아웃 후 로그인 완료!");
    setTimeout(() => navigate("/", { replace: true }), 1000);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "120px" }}>
      <h2>{message}</h2>

      {/* ✅ 기존 세션 감지 모달 */}
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

      {/* ✅ 제재 모달 */}
      {banInfo && (
        <Modal
          title="🚫 제재된 계정"
          confirmText="확인"
          onConfirm={() => {
            setBanInfo(null);
            navigate("/login", { replace: true });
          }}
        >
          <p style={{ marginBottom: "8px" }}>{banInfo.message}</p>

          {banInfo.type === "TEMP_BAN" && banInfo.remaining && (
            <p style={{ color: "#2563eb", fontWeight: 600 }}>
              남은 시간:{" "}
              {banInfo.remaining.days > 0 && `${banInfo.remaining.days}일 `}
              {banInfo.remaining.hours > 0 && `${banInfo.remaining.hours}시간 `}
              {banInfo.remaining.minutes > 0 && `${banInfo.remaining.minutes}분`}
            </p>
          )}

          <p style={{ marginTop: "10px", fontSize: "14px", color: "#6b7280" }}>
            문의: <b>support@solmatching.com</b>
          </p>
        </Modal>
      )}
    </div>
  );
}

export default SocialCallback;
