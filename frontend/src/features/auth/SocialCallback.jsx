// src/features/auth/SocialCallback.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal"; // ✅ 제재 모달 재활용

function SocialCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("⏳ 소셜 로그인 처리 중...");
  const [banInfo, setBanInfo] = useState(null); // ✅ 제재 모달 상태

  useEffect(() => {
    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get("access_token");
        const refreshToken = urlParams.get("refresh_token");
        const isNewUser = urlParams.get("new_user") === "true";

        // 🚫 access_token이 없으면 → 서버가 403/에러를 반환한 상황
        if (!accessToken || !refreshToken) {
          // 👉 API 요청 중 에러 발생했을 때 제재 detail이 있으면 모달 띄우기
          const errorParam = urlParams.get("error");
          if (errorParam) {
            const detail = JSON.parse(decodeURIComponent(errorParam));
            if (detail.type === "TEMP_BAN" || detail.type === "PERM_BAN") {
              setBanInfo(detail);
              return;
            }
          }

          setMessage("❌ 로그인 정보가 없습니다. 다시 시도해주세요.");
          setTimeout(() => navigate("/login", { replace: true }), 1500);
          return;
        }

        // ✅ 정상 로그인 처리
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);

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
        console.error("❌ 소셜 로그인 에러:", err);
        setMessage("⚠️ 로그인 처리 중 오류가 발생했습니다.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    })();
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "120px" }}>
      <h2>{message}</h2>

      {/* ✅ 제재 모달 표시 */}
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
            <p style={{ color: "#2563eb", fontWeight: "600" }}>
              남은 시간:{" "}
              {banInfo.remaining.days > 0 && `${banInfo.remaining.days}일 `}
              {banInfo.remaining.hours > 0 && `${banInfo.remaining.hours}시간 `}
              {banInfo.remaining.minutes > 0 &&
                `${banInfo.remaining.minutes}분`}
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
