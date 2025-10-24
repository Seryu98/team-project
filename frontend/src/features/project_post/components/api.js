// /src/features/project_post/components/api.js
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * 🤖 AI 설명 생성 요청
 * @param {string} prompt - 사용자 입력 프롬프트
 */
export async function generateAIDescription(prompt) {
  try {
    const res = await fetch(`${API_URL}/ai/expand`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.description;
  } catch (err) {
    console.error("AI 생성 실패:", err);
    throw new Error("AI 생성 요청 중 오류가 발생했습니다.");
  }
}
