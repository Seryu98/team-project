import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { FaBell, FaEnvelope } from "react-icons/fa";

export default function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ 더미 카운트 (나중에 API 연결해서 동적으로 변경 가능)
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [unreadMessages, setUnreadMessages] = useState(5);

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.warn("⚠ 로그인 사용자 없음");
      }
    }
    fetchUser();
  }, []);

  // ✅ 아이콘 버튼 + 뱃지 UI
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

      {/* 중앙 메뉴 (탭 스타일, 중앙 정렬) */}
      <div
        style={{
          display: "flex",
          gap: "30px",
          justifyContent: "center",
          flex: 1, // ✅ 좌우 여백 균등 → 정확히 가운데
        }}
      >
        <Link
          to="/posts"
          style={{
            textDecoration: "none",
            color: "black",
            padding: "8px 12px",
            borderRadius: "6px",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#f0f0f0")}
          onMouseOut={(e) => (e.target.style.background = "transparent")}
        >
          프로젝트/스터디 게시판
        </Link>

        <Link
          to="/board"
          style={{
            textDecoration: "none",
            color: "black",
            padding: "8px 12px",
            borderRadius: "6px",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#f0f0f0")}
          onMouseOut={(e) => (e.target.style.background = "transparent")}
        >
          유저게시판
        </Link>

        <Link
          to="/ranking"
          style={{
            textDecoration: "none",
            color: "black",
            padding: "8px 12px",
            borderRadius: "6px",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.target.style.background = "#f0f0f0")}
          onMouseOut={(e) => (e.target.style.background = "transparent")}
        >
          랭킹게시판
        </Link>
      </div>

      {/* 우측 */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        {currentUser ? (
          <>
            {/* 알림 아이콘 */}
            <IconButton
              icon={<FaBell />}
              count={unreadNotifications}
              onClick={() => alert("알림 페이지 연결 예정")}
              label="알림"
            />

            {/* 메시지 아이콘 */}
            <IconButton
              icon={<FaEnvelope />}
              count={unreadMessages}
              onClick={() => alert("메시지 페이지 연결 예정")}
              label="메시지"
            />

            {/* 프로필 */}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#ccc",
                cursor: "pointer",
              }}
              title={currentUser?.nickname}
              onClick={() => navigate("/profile")}
            />
          </>
        ) : (
          <button onClick={() => navigate("/login")}>로그인</button>
        )}
      </div>
    </nav>
  );
}