// src/components/SessionExpiredModal.jsx
import React from "react";
import Modal from "./Modal";
import { clearTokens } from "../features/auth/api";

function SessionExpiredModal({ onClose, message }) {
  const handleConfirm = () => {
    clearTokens(); // 토큰 제거
    if (onClose) onClose(); // App.jsx의 콜백 실행
  };

  return (
    <Modal
      title={message ? "중복 로그인 감지" : "세션 만료"}
      confirmText="확인"
      onConfirm={handleConfirm}
    >
      {message ? (
        <>
          {message}
          <br />
          다시 로그인해 주세요.
        </>
      ) : (
        <>
          일정 시간 동안 활동이 없어 자동 로그아웃되었습니다.
          <br />
          다시 로그인해 주세요.
        </>
      )}
    </Modal>
  );
}

export default SessionExpiredModal;
