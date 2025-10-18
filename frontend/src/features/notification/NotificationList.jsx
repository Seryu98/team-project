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

    // 🩵 [추가] 폴링 추가: 새로고침 없이도 10초마다 최신화
    const timer = setInterval(fetchList, 10000);

    return () => {
      window.removeEventListener("storage", handleRefresh);
      clearInterval(timer);
    };
  }, []);

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

      // 🩵 [수정] 유형별 이동 로직 (서버 Enum과 일치)
      switch (n.type) {
         case "ADMIN_NOTICE":
        // ✅ [추가됨 10/18] 공지사항 알림 클릭 시 → 공지사항 쪽지함으로 이동
          window.location.href = "/messages?tab=notice";
          break;

        case "MESSAGE":
          // [수정됨 10/18: 공지사항 쪽지 상세 이동 추가]
          if (n.category === "ADMIN" && n.related_id) {
            // ✅ 공지사항 쪽지 → 상세 페이지로 직접 이동
            window.location.href = `/messages/${n.related_id}`;
          } else {
            // ✅ 일반 쪽지
            window.location.href = `/messages/${n.related_id}`;
          }
          break;

        case "REPORT_RECEIVED":
          // ✅ 관리자 신고 접수 알림 → 관리자 쪽지함 이동
          window.location.href = "/messages?tab=admin";
          break;

        case "REPORT_RESOLVED":
        case "REPORT_REJECTED":
          // ✅ 신고 승인·반려 결과 → 관리자 쪽지함 이동
          window.location.href = "/messages?tab=admin";
          break;

        case "BAN":
        case "WARNING":
        case "UNBAN":
          // ✅ 제재·경고·해제 알림 → 관리자 쪽지함 이동
          window.location.href = "/messages?tab=admin";
          break;

        case "APPLICATION_ACCEPTED":
        case "APPLICATION_REJECTED":
          // ✅ 게시글 승인/거절 → 마이페이지 or 해당 게시글
          if (redirectPath) window.location.href = redirectPath;
          else window.location.href = "/myposts";
          break;

        case "REPORT_ADMIN_NOTICE":
          // 🩵 [추가] 신고 관련 관리자 시스템 공지 (대시보드 이동)
          window.location.href = "/admin/reports";
          break;

        default:
          if (redirectPath) {
            window.location.href = redirectPath;
          } else {
            // 🩵 [추가] 이동 경로가 없으면 콘솔만 출력 (디버깅용)
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
            {/* 🩵 [추가] 알림 타입 표시 (디버깅 시 가시성 ↑) */}
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
