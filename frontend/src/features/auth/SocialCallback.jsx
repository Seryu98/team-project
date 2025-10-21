// src/features/auth/SocialCallback.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function SocialCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("⏳ 소셜 로그인 처리 중...");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");
    const isNewUser = urlParams.get("new_user") === "true";  // ✅ 신규 사용자 확인

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

  return (
    <div style={{ textAlign: "center", marginTop: "120px" }}>
      <h2>{message}</h2>
    </div>
  );
}

export default SocialCallback;
