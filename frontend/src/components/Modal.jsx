import React, { useEffect } from "react";

function Modal({ title, children, confirmText = "확인", onConfirm, onClose }) {
  // ESC 닫기 + 바디 스크롤 잠금
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = orig;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: "18px" }}>{title}</h3>
        <div style={{ marginBottom: "16px", lineHeight: 1.5 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              닫기
            </button>
          )}
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
