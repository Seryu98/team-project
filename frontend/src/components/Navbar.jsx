// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaBell, FaEnvelope } from "react-icons/fa";
import { getCurrentUser, clearTokens } from "../features/auth/api";
import "./Navbar.css";
import logoImg from "../shared/assets/logo/logo.png";
import api from "../features/profile/api";
import defaultProfile from "../shared/assets/profile/default_profile.png";
import axios from "axios";

export default function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(0);

  // 알림 팝업 관련 상태
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

    const handleNotificationClick = () => {
      setNotificationOpen((prev) => !prev);
      setMenuOpen(false);
    };


  // ✅ 페이지 이동 시 스크롤 맨 위로 부드럽게 이동
  const handlePageChange = (newPage) => {
    setPage(newPage);
    const list = document.querySelector(".notification-list");
    if (list) list.scrollTo({ top: 0, behavior: "smooth" });
  };


  // 로그인 상태 확인 및 프로필 이미지 가져오기
  useEffect(() => {
    async function fetchUser() {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        // 프로필 이미지 가져오기 (캐시 방지용 타임스탬프 추가)
        const timestamp = new Date().getTime();
        const profileRes = await api.get(`/profiles/${user.id}?t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfileImage(profileRes.data.profile_image);
      } catch {
        clearTokens();
        setCurrentUser(null);
        setProfileImage(null);
      }
    }

    fetchUser();

    // ✅ 1. storage 이벤트 (다른 탭에서의 변경 감지)
    const handleStorageChange = () => {
      if (localStorage.getItem("refreshProfile") === "true") {
        fetchUser();
        localStorage.removeItem("refreshProfile");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // ✅ 2. 커스텀 이벤트 (같은 탭에서의 변경 감지)
    const handleProfileUpdate = () => {
      console.log("🔄 프로필 업데이트 이벤트 감지");
      fetchUser();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);

    // ✅ 3. 주기적으로 플래그 체크 (백업 방법)
    const intervalId = setInterval(() => {
      if (localStorage.getItem("refreshProfile") === "true") {
        console.log("🔄 플래그 감지로 프로필 새로고침");
        fetchUser();
        localStorage.removeItem("refreshProfile");
      }
    }, 1000); // 1초마다 체크

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      clearInterval(intervalId);
    };
  }, []);

  // -----------------------------
  // ✅ 알림 불러오기
  // -----------------------------
  async function fetchNotifications() {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // ✅ 읽지 않은 알림만 가져오기
      const { data } = await axios.get("http://localhost:8000/notifications", {
        params: { only_unread: true },
        headers: { Authorization: `Bearer ${token}` },
      });


      if (data?.data) setNotifications(data.data);
      else if (data?.items) setNotifications(data.items);

      // ✅ 안읽은 개수 갱신
      const unreadRes = await axios.get(
        "http://localhost:8000/notifications/unread_count",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (unreadRes?.data?.data?.count !== undefined)
        setUnreadCount(unreadRes.data.data.count);
    } catch (e) {
      console.error("❌ 알림 불러오기 실패:", e);

    }
  }

    const handleLogout = () => {
    clearTokens();
    setCurrentUser(null);
    setProfileImage(null);
    setMenuOpen(false);
    navigate("/login");
  };

  // -----------------------------
  // ✅ 주기적 알림 갱신
  // -----------------------------
  useEffect(() => {
    async function autoFetch() {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      await fetchNotifications();
    }
    autoFetch();
    const interval = setInterval(autoFetch, 3000);
    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // localStorage 이벤트 → Navbar 알림 즉시 새로고침
  // -----------------------------
useEffect(() => {
  const handleStorageChange = (e) => {
    const key = e?.key || "refreshNotifications";
    const value = e?.newValue || localStorage.getItem("refreshNotifications");

    if (key === "refreshNotifications" && value === "true") {
      console.log("🔔 즉시 알림 새로고침 실행됨");
      fetchNotifications(); // ✅ Navbar 갱신
      localStorage.removeItem("refreshNotifications");
    }
  };

  // ✅ 같은 탭에서도 커스텀 이벤트 직접 감지
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("refreshNotifications", handleStorageChange);

  // ✅ 혹시 이미 refreshNotifications=true인 경우 즉시 반영
  if (localStorage.getItem("refreshNotifications") === "true") {
    handleStorageChange();
  }

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("refreshNotifications", handleStorageChange);
  };
}, []);

  // -----------------------------
  // ✅ 알림 클릭 처리 (수정됨)
  // -----------------------------
  const handleNotificationItemClick = async (n) => {
    try {
      const token = localStorage.getItem("access_token");

      // ✅ 읽음 처리 API 요청
      await axios.post(
        "http://localhost:8000/notifications/mark_read",
        [n.id],
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ UI에서도 제거
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // ✅ DB와 동기화 - 읽음 후 새로 목록 갱신
      await fetchNotifications();

      // ✅ 이동 처리 (redirect_path가 있으면 우선 이동)
      if (n.redirect_path && n.redirect_path !== "None") {
        navigate(n.redirect_path);
      } else {
        console.log("ℹ️ 이동 경로 없음:", n);
      }

      setNotificationOpen(false);
    } catch (e) {
      console.error("❌ 알림 읽음 처리 실패:", e);
    }
  };

  const IconButton = ({ icon, count, onClick, label }) => (
    <div className="icon-button relative">
      <button onClick={onClick} aria-label={label}>
        {icon}
      </button>
      {count > 0 && <span className="icon-badge">{count}</span>}
    </div>
  );

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <img src={logoImg} alt="메인으로 이동" className="logo-img" />
      </div>

      <div className="navbar-links">
        <Link to="/posts" className="nav-link">
          프로젝트/스터디 게시판
        </Link>
        <Link to="/board" className="nav-link">
          유저게시판
        </Link>
        <Link to="/users/ranking" className="nav-link">
          랭킹게시판
        </Link>
        {currentUser?.role === "ADMIN" && (
          <button
            onClick={() => navigate("/admin")}
            className="nav-link border rounded px-2 py-1 hover:bg-gray-100"
            style={{ marginLeft: "8px" }}
          >
            관리자 대시보드
          </button>
        )}
      </div>

      <div className="navbar-right relative">
        {currentUser ? (
          <>
            {/* 🔔 알림 버튼 */}
            <div className="relative">
              <IconButton
                icon={<FaBell />}
                count={unreadCount}
                onClick={handleNotificationClick}
                label="알림"
              />

              {notificationOpen && (
                <div className="notification-popup">
                  <div className="header">
                    <span>알림</span>
                    <button
                      onClick={() => setNotificationOpen(false)}
                      className="close-btn"
                      aria-label="닫기"
                    >
                      ✕
                    </button>
                  </div>

                  {/* ✅ 페이지네이션용 상태 */}
                  <ul className="notification-list">
                    {notifications.length === 0 ? (
                      <li className="notification-empty">새 알림이 없습니다.</li>
                    ) : (
                      notifications
                        .slice(page * 5, page * 5 + 5)
                        .map((n) => {
                          const icons = {
                            MESSAGE: "💌",
                            REPORT_RECEIVED: "🚨",
                            APPLICATION_ACCEPTED: "✅",
                            APPLICATION_REJECTED: "❌",
                            FOLLOW: "👥",
                            WARNING: "⚠️",
                            BAN: "⛔",
                            UNBAN: "🔓",
                            DEFAULT: "🔔",
                          };
                          const icon = icons[n.type] || icons.DEFAULT;
                          const formattedDate = new Date(n.created_at).toLocaleString(
                            "ko-KR",
                            {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          );
                          return (
                            <li
                              key={n.id}
                              onClick={() => handleNotificationItemClick(n)}
                              className={`notification-item ${
                                n.is_read ? "read" : "unread"
                              }`}
                            >
                              <span className="notification-message">
                                {icon} {n.message}
                              </span>
                              <span className="notification-time">{formattedDate}</span>
                            </li>
                          );
                        })
                    )}
                  </ul>

                  {/* ✅ 페이지 네비게이션 */}
                  {notifications.length > 5 && (
                    <div className="notification-pagination">
                      <button
                        disabled={page === 0}
                        onClick={() => handlePageChange(page - 1)}
                        className="nav-btn"
                      >
                        ← 이전
                      </button>
                      <span className="page-indicator">
                        {page + 1} / {Math.ceil(notifications.length / 5)}
                      </span>
                      <button
                        disabled={(page + 1) * 5 >= notifications.length}
                        onClick={() => handlePageChange(page + 1)}
                        className="nav-btn"
                      >
                        다음 →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✉️ 쪽지 버튼 */}
            <IconButton
              icon={<FaEnvelope />}
              count={unreadMessages}
              onClick={() => navigate("/messages")}
              label="쪽지함"
            />

            <div className="profile-wrapper relative">
              <img
                src={
                  profileImage
                    ? `http://localhost:8000${profileImage}?t=${new Date().getTime()}`
                    : defaultProfile
                }
                alt="프로필"
                className="profile-avatar"
                title={currentUser?.nickname}
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setNotificationOpen(false);
                }}
              />
              {menuOpen && (
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/profile");
                    }}
                  >
                    내 프로필
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/account/settings");
                    }}
                  >
                    개인정보 수정
                  </button>
                  <button className="dropdown-item" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button className="login-button" onClick={() => navigate("/login")}>
            로그인
          </button>
        )}
      </div>
    </nav>
  );
}