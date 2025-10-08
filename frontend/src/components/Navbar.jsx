// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaBell, FaEnvelope } from "react-icons/fa";
import { getCurrentUser, clearTokens } from "../features/auth/api";
import "./Navbar.css";
import logoImg from "../shared/assets/logo/logo.png";
import api from "../features/profile/api";

export default function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [unreadNotifications] = useState(3);
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
        const profileRes = await api.get(
          `/profiles/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProfileImage(profileRes.data.profile_image);
      } catch {
        clearTokens();
        setCurrentUser(null);
        setProfileImage(null);
      }
    }
    fetchUser();
  }, []);

  // 로그아웃
  const handleLogout = () => {
    clearTokens();
    setCurrentUser(null);
    setProfileImage(null);
    setMenuOpen(false);
    navigate("/login");
  };

  const IconButton = ({ icon, count, onClick, label }) => (
    <div className="icon-button">
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
        <Link to="/ranking" className="nav-link">
          랭킹게시판
        </Link>
      </div>

      {/* 우측 */}
      <div className="navbar-right">
        {currentUser ? (
          <>
            <IconButton
              icon={<FaBell />}
              count={unreadNotifications}
              onClick={() => alert("알림 페이지 연결 예정")}
              label="알림"
            />
            <IconButton
              icon={<FaEnvelope />}
              count={unreadMessages}
              onClick={() => alert("메시지 페이지 연결 예정")}
              label="메시지"
            />
            <div className="profile-wrapper">
              <div
                className="profile-avatar"
                title={currentUser?.nickname}
                onClick={() => setMenuOpen(!menuOpen)}
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