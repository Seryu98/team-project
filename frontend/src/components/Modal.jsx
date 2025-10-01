// src/components/Modal.jsx
import React, { useEffect, useRef } from "react";

function Modal({ title, children, confirmText = "확인", onConfirm, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    setTimeout(() => {
      try {
        panelRef.current?.focus();
      } catch {}
    }, 0);

    // ✅ ESC로 닫기 허용
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

  // ✅ 배경 클릭으로 닫기 허용
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
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
        zIndex: 9999
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
          outline: "none"
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              cursor: "pointer"
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