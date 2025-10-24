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

    // 🩵 [추가] 폴링 추가: 새로고침 없이도 2초마다 최신화
    const timer = setInterval(fetchList, 2000);

    return () => {
      window.removeEventListener("storage", handleRefresh);
      clearInterval(timer);
    };
  }, []);

  // ================================================
  // ✅ 전체 삭제 / 쪽지함 이동 기능 추가
  // ================================================
  async function handleClearAll() {
    if (items.length === 0) {
      alert("삭제할 알림이 없습니다.");
      return;
    }
    if (!window.confirm("모든 알림을 읽음 처리하고 비우시겠습니까?")) return;
    try {
      await axios.post("/notifications/read-all"); // ✅ 전체 읽음 처리 API
      setItems([]);
      alert("모든 알림이 삭제되었습니다.");
    } catch (err) {
      console.error("❌ 전체 삭제 실패:", err);
      alert("전체 삭제 중 오류가 발생했습니다.");
    }
  }

  function handleGoMessages() {
    window.location.href = "/messages";
  }

  // ================================================
  // ✅ 알림 클릭 시 동작
  // ================================================
  async function onClickItem(n) {
    try {
      // 🩵 [수정] 클릭 즉시 읽음 처리 (오류 방지용)
      await axios.post(`/notifications/${n.id}/read`);
      setItems((prev) => prev.filter((x) => x.id !== n.id));

      // 🩵 [수정] redirect_path 'None' 문자열 방지
      const redirectPath =
        !n.redirect_path || n.redirect_path === "None" ? null : n.redirect_path;

      // 🩵 [10/20 수정됨] 신고자/관리자 REPORT_RECEIVED 분리 처리
      if (n.type === "REPORT_RECEIVED") {
        if (n.category === "NORMAL") {
          console.log("✅ 신고자용 신고 접수 알림 클릭: 이동 없이 읽음 처리만 수행");
          return;
        } else if (n.category === "ADMIN") {
          // 관리자용 신고 접수 알림 → 신고 관리 페이지로 이동
          window.location.href = n.redirect_path || "/admin/reports";
          return;
        }
      }

      // 🩵 [수정] 유형별 이동 로직 (서버 Enum과 일치)
      switch (n.type) {
        case "ADMIN_NOTICE":
          window.location.href = "/messages?tab=notice";
          break;

        case "MESSAGE":
          if (n.category === "ADMIN" && n.related_id) {
            window.location.href = `/messages?tab=notice&id=${n.related_id}`;
          } else {
            window.location.href = `/messages/${n.related_id}`;
          }
          break;

        case "REPORT_RECEIVED":
        case "REPORT_RESOLVED":
        case "REPORT_REJECTED":
        case "BAN":
        case "WARNING":
        case "UNBAN":
          if (n.category === "ADMIN") {
            window.location.href = "/messages?tab=admin";
          }
          break;

        case "APPLICATION_ACCEPTED":
        case "APPLICATION_REJECTED":
          console.log("✅ 승인/거절 알림 클릭: 이동 없이 읽음 처리 완료");
          break;

        case "REPORT_ADMIN_NOTICE":
          window.location.href = "/admin/reports";
          break;

        default:
          if (redirectPath) {
            window.location.href = redirectPath;
          } else {
            console.log("ℹ️ 이동 경로 없음:", n);
          }
          break;
      }
    } catch (err) {
      console.error("❌ 알림 클릭 처리 중 오류:", err);
    } finally {
      onClose?.(); // 팝업 닫기
    }
  }

  // ================================================
  // ✅ UI 렌더링 (스크롤 구조 수정됨)
  // ================================================
  return (
    <div
      className="absolute right-0 top-10 w-72 bg-white border shadow-lg rounded-lg z-50 flex flex-col"
      style={{ maxHeight: "400px" }}
    >
      {/* 상단 헤더 */}
      <div className="flex justify-between items-center px-3 py-2 border-b bg-white sticky top-0 z-20">
        <span className="font-semibold text-sm">알림</span>
        <button onClick={onClose} className="text-gray-500 text-sm">
          ✕
        </button>
      </div>

      {/* ✅ 컨트롤 버튼 영역 (고정) */}
      <div className="flex justify-between items-center px-3 py-2 border-b bg-gray-50 text-xs text-gray-600 sticky top-8 z-10">
        <button
          onClick={handleClearAll}
          className="hover:text-red-600 transition"
        >
          🗑️ 전체 삭제
        </button>
        <button
          onClick={handleGoMessages}
          className="hover:text-blue-600 transition"
        >
          ✉️ 쪽지함으로
        </button>
      </div>

      {/* ✅ 알림 목록 (이 부분만 스크롤됨) */}
      <ul
        className="divide-y text-sm overflow-y-auto flex-1 bg-white"
        style={{ maxHeight: "320px" }}
      >
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => onClickItem(n)}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            <div className="font-medium">
              {n.message}
              {process.env.NODE_ENV === "development" && (
                <span className="text-xs text-gray-400 ml-1">
                  ({n.type}/{n.category})
                </span>
              )}
            </div>
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
