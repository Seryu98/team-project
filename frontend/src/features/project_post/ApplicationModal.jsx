// /src/features/project_post/ApplicationModal.jsx
import { useState } from "react";
import { authFetch } from "../auth/api";
import Modal from "../../components/Modal";

export default function ApplicationModal({ postId, fields, onClose }) {
  const [answers, setAnswers] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // ================================
  // 🧩 입력/선택 핸들러
  // ================================
  const handleChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSelect = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  // ================================
  // 🎯 입력 유형 분류
  // ================================
  const isTextareaField = (name) =>
    [
      "지원사유",
      "자기소개",
      "경험/경력설명",
      "다룰 수 있는 언어/프로그램",
      "궁금한 점",
      "자유기재",
    ].includes(name);

  const isGenderField = (name) => name === "성별";
  const isJobStatusField = (name) => name === "직장인/취준생여부";

  // ================================
  // ⚙️ 입력 검증
  // ================================
  const validate = () => {
    for (const f of fields) {
      const val = answers[f.id];
      const label = f.name;
      if (!val || val.trim() === "") {
        setModalMessage(`⚠️ '${label}' 항목을 입력해주세요.`);
        setShowModal(true);
        return false;
      }
      if (isTextareaField(label) && val.trim().length < 5) {
        setModalMessage(`⚠️ '${label}' 항목은 최소 5자 이상 입력해야 합니다.`);
        setShowModal(true);
        return false;
      }
    }
    return true;
  };

  // ================================
  // 📤 제출 요청
  // ================================
  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await authFetch(`/recipe/${postId}/apply`, {
        method: "POST",
        body: JSON.stringify(
          Object.entries(answers).map(([fieldId, answer_text]) => ({
            field_id: Number(fieldId),
            answer_text,
          }))
        ),
      });
      setModalMessage("✅ 지원이 완료되었습니다!");
      setShowModal(true);
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error("🔥 지원 실패:", err);

      // 1️⃣ 서버 detail 메시지 → 우선순위 최고
      let msg =
        err?.response?.data?.detail ||
        err?.data?.detail ||
        err?.detail ||
        err?.message ||
        "지원 실패: 알 수 없는 오류가 발생했습니다.";

      // 2️⃣ 쿨타임 메시지 처리
      if (msg.includes("쿨타임")) {
        const sec = parseInt(msg.match(/\d+/)?.[0] || "0", 10);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const remain = h > 0 ? `${h}시간 ${m}분` : `${m}분`;
        msg = `⏳ 재신청은 ${remain} 이후에 가능합니다.`;
      }

      setModalMessage(msg);
      setShowModal(true);
    }


  };

  // ================================
  // 🧱 필드 렌더링
  // ================================
  const renderFieldInput = (field) => {
    const val = answers[field.id] || "";

    // ✅ textarea
    if (isTextareaField(field.name)) {
      return (
        <textarea
          rows={4}
          value={val}
          onChange={(e) => handleChange(field.id, e.target.value)}
          placeholder={`${field.name}을(를) 입력하세요 (최소 5자 이상)`}
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            resize: "none",
          }}
        />
      );
    }

    // ✅ 성별
    if (isGenderField(field.name)) {
      return (
        <div style={{ display: "flex", gap: "8px" }}>
          {["남", "여"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(field.id, opt)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor: val === opt ? "#2563eb" : "#f9fafb",
                color: val === opt ? "#fff" : "#111",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    // ✅ 직장인/취준생 여부
    if (isJobStatusField(field.name)) {
      return (
        <div style={{ display: "flex", gap: "8px" }}>
          {["직장인", "취준생"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(field.id, opt)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor: val === opt ? "#2563eb" : "#f9fafb",
                color: val === opt ? "#fff" : "#111",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    // ✅ 기본 input
    return (
      <input
        type="text"
        value={val}
        onChange={(e) => handleChange(field.id, e.target.value)}
        placeholder={`${field.name}을(를) 입력하세요`}
        style={{
          width: "100%",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />
    );
  };

  // ================================
  // 💄 UI 렌더링
  // ================================
  return (
    <>
      <Modal
        title={
          <div style={{ position: "relative" }}>
            지원서 작성
            {/* ✅ ApplicationModal 전용 X 버튼 */}
            <button
              onClick={onClose}
              aria-label="닫기"
              style={{
                position: "absolute",
                right: "-24px",
                top: "-4px",
                background: "transparent",
                border: "none",
                fontSize: "22px",
                color: "#666",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#111")}
              onMouseLeave={(e) => (e.target.style.color = "#666")}
            >
              ×
            </button>
          </div>
        }
        confirmText="제출하기"
        onConfirm={handleSubmit}
      >
        <div
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            paddingRight: "6px",
          }}
        >
          {fields?.map((field) => (
            <div key={field.id} style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "6px",
                }}
              >
                {field.name}
              </label>
              {renderFieldInput(field)}
            </div>
          ))}
        </div>
      </Modal>

      {/* ✅ 입력 검증용 모달 */}
      {showModal && (
        <Modal
          title="입력 확인"
          confirmText="확인"
          onConfirm={() => setShowModal(false)}
        >
          {modalMessage}
        </Modal>
      )}
    </>
  );
}
