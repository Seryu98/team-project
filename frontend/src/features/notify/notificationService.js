// 📌 알림 API 호출 서비스
// - axios를 이용해서 백엔드 FastAPI와 통신
// - 모든 API는 { success, data, message } 형태의 응답을 반환

import axios from "axios";

const API_BASE = "http://localhost:8000"; // 백엔드 서버 주소

// 알림 생성 API
export async function createNotification(payload) {
  const res = await axios.post(`${API_BASE}/notifications/`, payload);
  return res.data;
}

// 알림 목록 조회 API (페이징 & 읽음 필터 지원)
export async function getNotifications(userId, { unread = false, skip = 0, limit = 10 } = {}) {
  const res = await axios.get(`${API_BASE}/notifications/${userId}`, {
    params: { unread, skip, limit }
  });
  return res.data;
}

// 알림 읽음 처리 API
export async function markNotificationRead(notificationId) {
  const res = await axios.patch(`${API_BASE}/notifications/${notificationId}/read`);
  return res.data;
}
