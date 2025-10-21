// src/features/notification/NotificationList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function NotificationList({ onClose }) {
  const [items, setItems] = useState([]);

  // ✅ axios 기본 설정 (토큰 자동 추가)
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
    withCredentials: true,
  });

  // ✅ 요청 인터셉터: Authorization 헤더 추가
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ✅ 응답 인터셉터: 세션 만료 시 이벤트 발생
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        console.warn("🔒 세션 만료됨 (알림 API)");
        localStorage.setItem("session_expired", "true");
        window.dispatchEvent(new Event("sessionExpired"));
      }
      return Promise.reject(error);
    }
  );

  // ================================================
  // ✅ 알림 목록 불러오기
  // ================================================
  async function fetchList() {
    try {
      const { data } = await api.get("/notifications", {
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
  // ✅ 알림 클릭 시 동작
  // ================================================
  async function onClickItem(n) {
    try {
      // 🩵 [수정] 클릭 즉시 읽음 처리 (오류 방지용)
      await api.post(`/notifications/${n.id}/read`);
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
          window.location.href = "/messages?tab=admin";
          return;
        }
      }

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
            window.location.href = `/messages?tab=notice&id=${n.related_id}`;
          } else {
            // ✅ 일반 쪽지
            window.location.href = `/messages/${n.related_id}`;
          }
          break;

        
        // ✅ 관리자 관련 → 관리자 쪽지함으로 이동 [수정 10/19]
        case "REPORT_RECEIVED":
        case "REPORT_RESOLVED":
        case "REPORT_REJECTED":
        case "BAN":
        case "WARNING":
        case "UNBAN":
          // ✅ 제재·경고·해제 알림 → 관리자 쪽지함 이동
          // 🩵 [보완] ADMIN 카테고리만 이동 (일반 신고자는 위에서 return)
          if (n.category === "ADMIN") {
            window.location.href = "/messages?tab=admin";
          }
          break;
          
        case "APPLICATION_ACCEPTED":
        case "APPLICATION_REJECTED":
          // ✅ 게시글 승인/거절 알림은 이동 없이 읽음 처리만 [10/19 수정]
          console.log("✅ 승인/거절 알림 클릭: 이동 없이 읽음 처리 완료");
          break;

        case "REPORT_ADMIN_NOTICE":
          // 🩵 [추가] 신고 관련 관리자 시스템 공지 (대시보드 이동)
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
