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

    if (accessToken && refreshToken) {
      // ✅ 토큰 저장
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      setMessage("✅ 로그인 성공! 메인 페이지로 이동합니다...");

      // ✅ 1초 후 메인으로 이동
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
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
