import axios from "axios";

// ✅ BASE URL 수정 (환경 변수 지원)
const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API = `${BASE}/messages`;

export const sendMessage = (data) =>
  axios.post(`${API}/`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

// ✅ userId 제거 (백엔드에서 current_user로 판별)
export const getInbox = () =>
  axios.get(`${API}/inbox`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const getSent = () =>
  axios.get(`${API}/sent`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const getMessage = (msgId) =>
  axios.get(`${API}/${msgId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const markAsRead = (msgId) =>
  axios.patch(`${API}/${msgId}/read`, {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

export const deleteMessage = (msgId) =>
  axios.delete(`${API}/${msgId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

// 🔍 닉네임으로 사용자 검색
export const findUserByNickname = (nickname) =>
  axios.get(`${BASE}/users/by-nickname?nickname=${encodeURIComponent(nickname)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
