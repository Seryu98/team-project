// /src/components/Modal.jsx
import React, { useEffect, useRef, useState } from "react";

function Modal({ title, children, confirmText = "확인", onConfirm }) {
  const panelRef = useRef(null);
  const [verifyCode, setVerifyCode] = useState("");

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    // ✅ ESC 차단 (닫히지 않게)
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // ✅ 배경 클릭 무시
  const handleBackdropClick = (e) => {
    e.stopPropagation();
  };

  // ✅ 숫자만 입력되도록 처리 (이메일 인증일 때만)
  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length <= 6) setVerifyCode(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onConfirm) {
      if (title === "이메일 인증") onConfirm(verifyCode);
      else onConfirm();
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
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "10vh", // ✅ 상단 중앙 배치
        zIndex: 999999, // ✅ (추가) 모든 컨텍스트 위로 올림
        pointerEvents: "auto", // ✅ (추가) 부모 overflow/transform 무시
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
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          outline: "none",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="modal-title"
          style={{
            margin: "0 0 12px",
            fontSize: "18px",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {title}
        </h3>

        <div
          style={{
            marginBottom: "16px",
            lineHeight: 1.6,
            textAlign: "center",
            color: "#333",
          }}
        >
          {children}
        </div>

        {/* 이메일 인증 모드일 때만 입력창 표시 */}
        {title === "이메일 인증" && (
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
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
              textAlign: "center",
            }}
          />
        )}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={() =>
              onConfirm &&
              (title === "이메일 인증" ? onConfirm(verifyCode) : onConfirm())
            }
            disabled={title === "이메일 인증" && verifyCode.length !== 6}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background:
                title === "이메일 인증"
                  ? verifyCode.length === 6
                    ? "#2563eb"
                    : "#94a3b8"
                  : "#2563eb",
              color: "#fff",
              fontSize: "15px",
              cursor: "pointer",
              fontWeight: "500",
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
