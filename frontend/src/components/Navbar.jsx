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

  // 알림 팝업 관련 상태
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 메시지 카운트 (추후 API로 대체 예정)
  const [unreadMessages] = useState(5);

  // 로그인 상태 확인 및 프로필 이미지 가져오기
  useEffect(() => {
    async function fetchUser() {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        // 프로필 이미지 가져오기
        const profileRes = await api.get(`/profiles/${user.id}`, {
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

    // ✅ refreshProfile flag 감지해서 다시 유저 불러오기
    const handleStorageChange = () => {
      if (localStorage.getItem("refreshProfile") === "true") {
        fetchUser();
        localStorage.removeItem("refreshProfile");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 알림 불러오기
  useEffect(() => {
    if (!currentUser) return;

    async function fetchNotifications() {
      try {
        const { data } = await axios.get("http://localhost:8000/notifications", {
          params: { only_unread: false },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        if (data?.data) setNotifications(data.data);

        const unreadRes = await axios.get(
          "http://localhost:8000/notifications/unread_count",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );
        if (unreadRes?.data?.data?.count !== undefined)
          setUnreadCount(unreadRes.data.data.count);
      } catch (e) {
        console.error("❌ 알림 불러오기 실패:", e);
      }
    }

    fetchNotifications();

    // 일정 주기(30초)마다 갱신
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // 로그아웃
  const handleLogout = () => {
    clearTokens();
    setCurrentUser(null);
    setProfileImage(null);
    setMenuOpen(false);
    navigate("/login");
  };

  // 알림 클릭
  const handleNotificationClick = () => {
    setNotificationOpen((prev) => !prev);
    setMenuOpen(false); // 프로필 메뉴는 닫기
  };

  // 알림 항목 클릭
  const handleNotificationItemClick = (n) => {
    if (n.type === "MESSAGE" && n.related_id) {
      navigate(`/messages/${n.related_id}`);
    }
    setNotificationOpen(false);
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
      {/* 좌측 로고 */}
      <div className="navbar-logo" onClick={() => navigate("/")}>
        <img src={logoImg} alt="메인으로 이동" className="logo-img" />
      </div>

      {/* 중앙 메뉴 */}
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
        {/* ✅ 관리자 전용 버튼 */}
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

      {/* 우측 */}
      <div className="navbar-right relative">
        {currentUser ? (
          <>
            {/* 알림 버튼 + 팝업 */}
            <div className="relative">
              <IconButton
                icon={<FaBell />}
                count={unreadCount}
                onClick={handleNotificationClick}
                label="알림"
              />
              {notificationOpen && (
                <div className="notification-popup absolute right-0 mt-2 w-72 bg-white border shadow-lg rounded-lg z-50">
                  <div className="flex justify-between items-center px-3 py-2 border-b">
                    <span className="font-semibold text-sm">알림</span>
                    <button
                      onClick={() => setNotificationOpen(false)}
                      className="text-gray-500 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="divide-y text-sm max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <li className="px-3 py-4 text-center text-gray-400">
                        알림이 없습니다.
                      </li>
                    ) : (
                      notifications.map((n) => (
                        <li
                          key={n.id}
                          onClick={() => handleNotificationItemClick(n)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <div>{n.message}</div>
                          <div className="text-xs text-gray-400">
                            {n.created_at}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* 메시지 버튼 */}
            <IconButton
              icon={<FaEnvelope />}
              count={unreadMessages}
              onClick={() => navigate("/messages")}
              label="메시지"
            />

            {/* 프로필 */}
            <div className="profile-wrapper relative">
              <img
                src={
                  profileImage
                    ? `http://localhost:8000${profileImage}`
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