 // src/features/admin/AdminService.js
import axios from "axios";
const API = "http://localhost:8000/admin";

export async function getPendingPosts(token) {
  const res = await axios.get(`${API}/pending-posts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

export async function approvePost(id, token) {
  await axios.post(`${API}/posts/${id}/approve`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function rejectPost(id, reason, token) {
  await axios.post(`${API}/posts/${id}/reject`, { reason }, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPendingReports(token) {
  const res = await axios.get(`${API}/pending-reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data;
}

export async function resolveReport(id, action, token) {
  await axios.post(
    `${API}/reports/${id}/resolve`,
    { action, reason: "관리자 판단에 따른 처리" },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}
