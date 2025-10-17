// src/components/Modal.jsx
import React, { useEffect, useRef, useState } from "react";

function Modal({ title, children, confirmText = "확인", onConfirm, onClose }) {
  const panelRef = useRef(null);
  const [verifyCode, setVerifyCode] = useState(""); // ✅ 인증코드 입력 상태 추가

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      try {
        panelRef.current?.focus();
      } catch {}
    }, 0);

    // ESC로 닫기
    const onKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [onClose]);

  // 배경 클릭으로 닫기
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  // ✅ 숫자만 입력되도록 처리 + 6자리 제한
  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, ""); // 숫자만 허용
    if (val.length <= 6) {
      setVerifyCode(val);
    }
  };

  // ✅ Enter로도 확인 버튼 실행
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onConfirm) {
      // ✅ 이메일 인증 모달일 때만 인증코드 전달
      if (title === "이메일 인증") {
        onConfirm(verifyCode);
      } else {
        onConfirm();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          width: "min(420px, 92vw)",
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          outline: "none",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 X 버튼 */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "transparent",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        )}

        <h3 id="modal-title" style={{ margin: "0 0 12px", fontSize: "18px" }}>
          {title}
        </h3>

        <div style={{ marginBottom: "16px", lineHeight: 1.5 }}>
          {/* ✅ children만 렌더링 (설명 텍스트나 안내만 받기) */}
          {children}
        </div>

        {/* ✅ 인증코드 입력창 (Modal 내부 1개만 유지, 이메일 인증 모달일 때만 표시) */}
        {title === "이메일 인증" && (
          <input
            type="text" // ✅ number → text
            inputMode="numeric" // ✅ 모바일 숫자 키패드
            maxLength={6} // ✅ 6자리 제한
            value={verifyCode}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            placeholder="인증코드 6자리"
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: "15px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              marginBottom: "16px",
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() =>
              onConfirm && (title === "이메일 인증" ? onConfirm(verifyCode) : onConfirm())
            } // ✅ 이메일 인증일 때만 verifyCode 전달
            disabled={title === "이메일 인증" && verifyCode.length !== 6} // ✅ 인증 모달일 때만 6자리 제한 적용
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background:
                title === "이메일 인증"
                  ? verifyCode.length === 6
                    ? "#2563eb"
                    : "#94a3b8" // ✅ 비활성 시 회색
                  : "#2563eb", // ✅ 일반 모달은 항상 파란색 버튼
              color: "#fff",
              cursor:
                title === "이메일 인증" && verifyCode.length !== 6
                  ? "not-allowed"
                  : "pointer",
              transition: "background 0.2s",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
