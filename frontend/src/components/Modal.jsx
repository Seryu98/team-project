// src/components/Modal.jsx
import React, { useEffect, useRef } from "react";

function Modal({ title, children, confirmText = "확인", onConfirm }) {
  const panelRef = useRef(null);

  // 바디 스크롤 잠금 + 최초 포커스
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 패널에 포커스
    setTimeout(() => {
      try {
        panelRef.current?.focus();
      } catch {}
    }, 0);

    // ESC 금지: 리스너는 등록하되, 동작은 막는다.
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        // ESC로 닫히는 것을 막음
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
    // 아무 것도 하지 않음 (닫히지 않도록)
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
        // 안쪽 클릭은 그대로 통과 (닫힘 방지)
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
