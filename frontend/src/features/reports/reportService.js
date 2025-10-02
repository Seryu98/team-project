import axios from "axios";

const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ✅ 신고 생성
export async function createReport(payload) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("로그인이 필요합니다.");

  console.log("🚨 Axios 요청 Authorization 헤더:", token);
  console.log("🚨 Axios 요청 payload:", payload);

  const res = await axios.post(`${base}/reports`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ✅ 관리자: 신고 목록 조회 (페이지네이션/필터 지원)
export async function getReports({ page = 1, size = 20, status, targetType } = {}) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("로그인이 필요합니다.");

  const params = { page, size };
  if (status) params.status = status;
  if (targetType) params.target_type = targetType;

  const res = await axios.get(`${base}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data;
}

// ✅ 관리자: 신고 상태 변경
export async function updateReportStatus(reportId, status) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("로그인이 필요합니다.");

  const res = await axios.patch(
    `${base}/reports/${reportId}/status`,
    { status }, // ✅ body 전달
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}
