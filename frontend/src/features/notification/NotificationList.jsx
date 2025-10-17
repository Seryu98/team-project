// src/features/notification/NotificationList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function NotificationList({ onClose }) {
  const [items, setItems] = useState([]);

  // ================================================
  // ✅ 알림 목록 불러오기
  // ================================================
  async function fetchList() {
    try {
      const { data } = await axios.get("/notifications", {
        params: { only_unread: false },
      });
      if (data?.data) setItems(data.data);
    } catch (err) {
      console.error("❌ 알림 불러오기 실패:", err);
    }
  }

  useEffect(() => {
    fetchList();

    // ✅ storage 이벤트 감지해서 실시간 새로고침
  const handleRefresh = (e) => {
    if (e.key === "refreshNotifications") {
      fetchList();
    }
  };
  window.addEventListener("storage", handleRefresh);

  return () => window.removeEventListener("storage", handleRefresh);
}, []);

  // ================================================
  // ✅ 알림 클릭 시 동작
  // ================================================
  async function onClickItem(n) {
    try {
      // 🩵 [1] redirect_path가 None 또는 빈 값이면 → 읽음 처리만 하고 이동 없음
      if (!n.redirect_path || n.redirect_path === "None") {
        await axios.post(`/notifications/${n.id}/read`);
        setItems((prev) => prev.filter((x) => x.id !== n.id));
        onClose?.();
        return;
      }

      // 🩵 [2] 알림 유형별 경로 처리
      if (n.type === "MESSAGE") {
        window.location.href = `/messages/${n.related_id}`;
      } 
      else if (n.type === "REPORT_RECEIVED") {
        // ✅ 관리자 신고 접수 알림 → 관리자 쪽지함으로 이동
        window.location.href = "/messages?tab=admin";
      } 
      else if (n.type === "REPORT_REJECTED" || n.type === "REPORT_RESOLVED") {
        // ✅ 신고 결과 알림 (승인/반려) → 관리자 쪽지함으로 이동
        window.location.href = "/messages?tab=admin";
      }
      else if (["BAN", "WARNING", "UNBAN"].includes(n.type)) {
        window.location.href = "/messages?tab=admin";
      } 
      else {
        window.location.href = n.redirect_path;
      }

      // 🩵 [3] 클릭 시 읽음 처리
      await axios.post(`/notifications/${n.id}/read`);
      setItems((prev) => prev.filter((x) => x.id !== n.id));
    } catch (err) {
      console.error("❌ 알림 클릭 처리 중 오류:", err);
    } finally {
      onClose?.(); // 팝업 닫기
    }
  }

  // ================================================
  // ✅ UI 렌더링
  // ================================================
  return (
    <div
      className="absolute right-0 top-10 w-72 bg-white border shadow-lg rounded-lg z-50"
      style={{ maxHeight: "400px", overflowY: "auto" }}
    >
      <div className="flex justify-between items-center px-3 py-2 border-b">
        <span className="font-semibold text-sm">알림</span>
        <button onClick={onClose} className="text-gray-500 text-sm">
          ✕
        </button>
      </div>

      <ul className="divide-y text-sm">
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => onClickItem(n)}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            {/* 🩵 메시지 내용 */}
            <div>{n.message}</div>
            <div className="text-xs text-gray-400">
              {new Date(n.created_at).toLocaleString()}
            </div>
          </li>
        ))}

        {items.length === 0 && (
          <li className="px-3 py-4 text-center text-gray-400">
            알림이 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}
