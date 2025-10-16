// src/shared/api/reportApi.js
import axios from "axios";

const API_BASE = "http://localhost:8000";

export async function submitReport(targetType, targetId, reason) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("로그인이 필요합니다.");

  const payload = {
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim(),
  };

  const res = await axios.post(`${API_BASE}/reports`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}
