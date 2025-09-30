// 📌 알림 페이지
// - API 호출을 통해 알림 목록 가져오기
// - 읽음 처리 기능 지원
// - 상태 관리: React useState + useEffect 사용

import React, { useEffect, useState } from "react";
import { getNotifications, markNotificationRead } from "../services/notificationService";
import NotificationList from "../components/NotificationList";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]); // 알림 목록 상태

  // 📌 알림 목록 불러오기
  async function loadNotifications() {
  try {
    const res = await getNotifications(1, { skip: 0, limit: 10 }); // user_id=1 확인
    console.log("API 응답:", res); // 👉 터미널/브라우저 콘솔에서 확인
    if (res?.success && Array.isArray(res.data)) {
      setNotifications(res.data);
    } else {
      setNotifications([]);
    }
  } catch (err) {
    console.error("알림 조회 에러:", err);
    setNotifications([]);
  }
}



  // 🔹 알림 읽음 처리
  async function handleRead(id) {
    const res = await markNotificationRead(id);
    if (res.success) {
      loadNotifications(); // 목록 새로고침
    }
  }

  // 🔹 컴포넌트 마운트 시 알림 불러오기
  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">알림</h1>
      <NotificationList notifications={notifications} onRead={handleRead} />
    </div>
  );
}

export default NotificationsPage;
