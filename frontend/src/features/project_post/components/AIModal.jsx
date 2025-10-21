// /src/features/project_post/components/AIModal.jsx
import { useState } from "react";
import { generateAIDescription } from "./api";
import "./aiForm.css";

export default function AIModal({ onClose, onResult }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return alert("프로젝트 설명을 입력해주세요.");
    setLoading(true);
    try {
      const desc = await generateAIDescription(prompt);

      // ✅ Quill에 맞게 문단 단위로 변환 (줄바꿈 → <p> 태그)
      const formattedDesc = desc
        .split(/\n+/)
        .map((line) => `<p>${line.trim()}</p>`)
        .join("");

      setResult(formattedDesc);
      onResult(formattedDesc); // ✅ HTML 포맷으로 전달
    } catch (err) {
      alert("AI 생성 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onClose();
  };

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal-panel">
        {/* 제목 */}
        <h3 className="ai-modal-title" style={{ marginBottom: "12px" }}>
          AI로 프로젝트 설명 생성
        </h3>

        <p className="ai-modal-sub">
          작업하고자 하는 프로젝트에 대해 <strong>50자 이내</strong>로 설명해주세요.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 여행 일정 공유 앱을 만들고 싶어요."
          maxLength={50}
          className="ai-modal-textarea"
          disabled={loading || result}
        />

        {/* ✅ 버튼 영역 */}
        <div className="ai-modal-buttons">
          {result ? (
            <button className="ai-modal-button" onClick={handleConfirm}>
              확인
            </button>
          ) : (
            <>
              <button
                className="ai-modal-button ai-modal-cancel"
                onClick={onClose}
                disabled={loading}
              >
                취소
              </button>
              <button
                className="ai-modal-button"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "생성 중..." : "생성하기"}
              </button>
            </>
          )}
        </div>

        {/* ✅ 결과 표시 */}
        {result && (
          <div
            className="ai-modal-result"
            dangerouslySetInnerHTML={{ __html: result }}
          />
        )}
      </div>
    </div>
  );
}
