// src/services/applicationService.js
const API = import.meta.env.VITE_API_BASE_URL || ""; // 예: "/api"

export async function getRequiredFields(postId) {
  const res = await fetch(`${API}/applications/required-fields?post_id=${postId}`);
  if (!res.ok) throw new Error("필수 질문을 불러오지 못했습니다.");
  return res.json();
}

export async function submitApplication(postId, answers) {
  const res = await fetch(`${API}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ post_id: postId, answers }),
  });
  if (!res.ok) throw new Error("지원서 제출에 실패했습니다.");
  return res.json();
}

export async function fetchApplications(postId) {
  const url = postId ? `${API}/applications?post_id=${postId}` : `${API}/applications`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("지원 목록을 불러오지 못했습니다.");
  return res.json();
}

export async function processApplication(id, status) {
  const res = await fetch(`${API}/applications/${id}?status=${status}`, { method: "PUT" });
  if (!res.ok) throw new Error("지원 처리에 실패했습니다.");
  return res.json();
}
