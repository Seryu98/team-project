// frontend/src/features/project_post/ApplicationModal.jsx
import { useState } from "react";
import axios from "axios";
import Modal from "../../components/Modal";

export default function ApplicationModal({ postId, fields, onClose }) {
  const [answers, setAnswers] = useState({});

  const handleChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:8000/recipe/${postId}/apply`,
        Object.entries(answers).map(([fieldId, answer_text]) => ({
          field_id: Number(fieldId),
          answer_text,
        })),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 지원 완료!");
      onClose(); // ✅ 제출 후 모달 닫기
    } catch (err) {
      alert("❌ 지원 실패: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <Modal
      title="지원서 작성"
      confirmText="제출하기"
      onConfirm={handleSubmit}
      onClose={onClose}   // ✅ X 버튼 활성화
    >
      {fields?.map((field) => (
        <div key={field.id} style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "6px" }}>
            {field.name}
          </label>
          <input
            type="text"
            value={answers[field.id] || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "6px",
            }}
          />
        </div>
      ))}
    </Modal>
  );
}
