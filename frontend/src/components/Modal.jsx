// src/components/Modal.jsx
import React, { useEffect, useRef } from "react";

function Modal({ title, children, confirmText = "확인", onConfirm, onClose }) {
  const panelRef = useRef(null);

  // 바디 스크롤 잠금 + 최초 포커스
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      try {
        panelRef.current?.focus();
      } catch {}
    }, 0);

    // ESC 금지
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // 배경 클릭 금지
  const handleBackdropClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
          position: "relative", // ✅ X버튼 위치 잡으려면 relative 필요
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 🔴 닫기 X 버튼 */}
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

        <div style={{ marginBottom: "16px", lineHeight: 1.5 }}>{children}</div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
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
