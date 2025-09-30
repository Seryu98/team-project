// src/features/reports/reportService.js
import axios from "axios";

const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ✅ 신고 생성 (유저, 게시글, 댓글 등)
export const createReport = async (data) => {
  const token = localStorage.getItem("token");
  return axios.post(`${base}/reports`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ✅ (옵션) 관리자 전용: 전체 신고 내역 조회
export const getReports = async () => {
  const token = localStorage.getItem("token");
  return axios.get(`${base}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ✅ (옵션) 관리자 전용: 신고 상태 변경 (RESOLVED / REJECTED)
export const updateReportStatus = async (reportId, status) => {
  const token = localStorage.getItem("token");
  return axios.patch(
    `${base}/reports/${reportId}/status?status=${status}`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
};
