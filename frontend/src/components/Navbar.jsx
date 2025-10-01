import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaBell, FaEnvelope } from "react-icons/fa";
import { getCurrentUser, clearTokens } from "../features/auth/api";
import axios from "axios";

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
        const profileRes = await axios.get(
          `http://localhost:8000/profiles/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProfileImage(profileRes.data.profile_image);
      } catch {
        console.warn("⚠ 로그인 사용자 없음 또는 토큰 만료");
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

  // 아이콘 버튼
  const IconButton = ({ icon, count, onClick, label }) => (
    <div style={{ position: "relative" }}>
      <button
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          position: "relative",
        }}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
      </button>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            background: "red",
            color: "white",
            borderRadius: "50%",
            padding: "2px 6px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        borderBottom: "1px solid #ddd",
        backgroundColor: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* 좌측 로고 */}
      <div
        style={{ fontWeight: "bold", cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        로고(누르면 메인)
      </div>

      {/* 중앙 메뉴 */}
      <div
        style={{
          display: "flex",
          gap: "30px",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <Link to="/posts" style={linkStyle}>
          프로젝트/스터디 게시판
        </Link>
        <Link to="/board" style={linkStyle}>
          유저게시판
        </Link>
        <Link to="/ranking" style={linkStyle}>
          랭킹게시판
        </Link>
      </div>

      {/* 우측 */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
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
            <div style={{ position: "relative" }}>
              <img
                src={
                  profileImage
                    ? profileImage.startsWith('/static')
                      ? `http://localhost:8000${profileImage}`
                      : profileImage
                    : "/assets/profile/Provisionalprofile.png"
                }
                alt="프로필"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  cursor: "pointer",
                  border: "1px solid #ddd",
                }}
                title={currentUser?.nickname}
                onClick={() => setMenuOpen(!menuOpen)}
              />
              {menuOpen && (
                <div style={dropdownStyle}>
                  <button style={menuButtonStyle} onClick={() => navigate("/profile")}>
                    내 프로필
                  </button>
                  <button style={menuButtonStyle} onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button onClick={() => navigate("/login")}>로그인</button>
        )}
      </div>
    </nav>
  );
}

const linkStyle = {
  textDecoration: "none",
  color: "black",
  padding: "8px 12px",
  borderRadius: "6px",
  transition: "0.2s",
};
const dropdownStyle = {
  position: "absolute",
  top: "40px",
  right: 0,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "6px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  zIndex: 2000,
  minWidth: "120px",
};
const menuButtonStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "none",
  background: "none",
  textAlign: "left",
  cursor: "pointer",
};