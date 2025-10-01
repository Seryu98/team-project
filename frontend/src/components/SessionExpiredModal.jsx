// src/components/SessionExpiredModal.jsx
import React from "react";
import Modal from "./Modal";
import { clearTokens } from "../features/auth/api";

function SessionExpiredModal({ onClose }) {
  const handleConfirm = () => {
    clearTokens(); // 토큰 제거 + 로그인 화면으로 이동
    if (onClose) onClose();
  };

  return (
    <Modal title="세션 만료" confirmText="확인" onConfirm={handleConfirm}>
      일정 시간 동안 활동이 없어 자동 로그아웃됩니다.
      다시 로그인해 주세요.
    </Modal>
  );
}

export default SessionExpiredModal;
