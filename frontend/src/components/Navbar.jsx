import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { FaBell, FaEnvelope } from "react-icons/fa";
// ✅ 쪽지 API
import { getInbox } from "../features/message/MessageService";

export default function Navbar({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();

  // ✅ 알림/메시지 상태
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [messageOpen, setMessageOpen] = useState(false);

  // ✅ 프로필 메뉴
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ 알림 불러오기
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const res = await axios.get(`${base}/notifications?skip=0&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ 응답 구조 안전 처리
      const items = res.data?.data?.items ?? res.data ?? [];
      setNotifications(items);
      setUnreadNotifications(items.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error("알림 조회 실패", err);
    }
  };

  // ✅ 알림 읽음 처리
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      await axios.patch(`${base}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("읽음 처리 실패", err);
    }
  };

  // ✅ 알림 클릭 시 이동
  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    switch (n.type) {
      case "FOLLOW":
        navigate(`/profile/${n.related_id}`);
        break;
      case "APPLICATION":
        navigate(`/posts/${n.related_id}/applications`);
        break;
      case "APPROVED":
      case "REJECTED":
        navigate(`/applications/${n.related_id}`);
        break;
      default:
        console.log("알 수 없는 알림:", n);
    }
  };

  // ✅ 쪽지 불러오기
  const fetchMessages = async () => {
    try {
      if (!currentUser) return;
      const res = await getInbox(currentUser.id);
      setMessages(res.data);
      setUnreadMessages(res.data.filter((m) => !m.is_read).length);
    } catch (err) {
      console.error("쪽지 조회 실패", err);
    }
  };

  // ✅ 유저 로그인 상태일 때 쪽지 불러오기
  useEffect(() => {
    if (currentUser) {
      fetchMessages();
    }
  }, [currentUser]);

  // ✅ 로그아웃
  const handleLogout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    setMenuOpen(false);
    navigate("/login");
  };

  // ✅ 아이콘 버튼 + 뱃지
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
      <div style={{ display: "flex", gap: "30px", justifyContent: "center", flex: 1 }}>
        <Link to="/posts">프로젝트/스터디 게시판</Link>
        <Link to="/board">유저게시판</Link>
        <Link to="/ranking">랭킹게시판</Link>
      </div>

      {/* 우측 */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        {currentUser ? (
          <>
            {/* 알림 아이콘 + 드롭다운 */}
            <div style={{ position: "relative" }}>
              <IconButton
                icon={<FaBell />}
                count={unreadNotifications}
                onClick={() => {
                  setNotificationOpen(!notificationOpen);
                  if (!notificationOpen) fetchNotifications();
                }}
                label="알림"
              />
              {notificationOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 2000,
                    minWidth: "250px",
                  }}
                >
                  {notifications.length === 0 ? (
                    <div style={{ padding: "10px" }}>알림이 없습니다.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: "10px",
                          cursor: "pointer",
                          background: n.is_read ? "#fff" : "#eef6ff",
                          borderBottom: "1px solid #eee",
                        }}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div style={{ fontSize: "14px" }}>{n.message}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "none",
                      background: "#f0f0f0",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate("/notifications")}
                  >
                    모든 알림 보기
                  </button>
                </div>
              )}
            </div>

            {/* 쪽지 아이콘 + 드롭다운 */}
            <div style={{ position: "relative" }}>
              <IconButton
                icon={<FaEnvelope />}
                count={unreadMessages}
                onClick={() => {
                  setMessageOpen(!messageOpen);
                  if (!messageOpen) fetchMessages();
                }}
                label="메시지"
              />
              {messageOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 2000,
                    minWidth: "250px",
                  }}
                >
                  {messages.length === 0 ? (
                    <div style={{ padding: "10px" }}>쪽지가 없습니다.</div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: "10px",
                          cursor: "pointer",
                          background: m.is_read ? "#fff" : "#eef6ff",
                          borderBottom: "1px solid #eee",
                        }}
                        onClick={() => navigate(`/messages/${m.id}`)}
                      >
                        <div style={{ fontSize: "14px", fontWeight: "bold" }}>{m.sender_name}</div>
                        <div style={{ fontSize: "13px" }}>{m.content}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "none",
                      background: "#f0f0f0",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate("/messages")}
                  >
                    모든 쪽지 보기
                  </button>
                </div>
              )}
            </div>

            {/* 프로필 드롭다운 */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#ccc",
                  cursor: "pointer",
                }}
                title={currentUser?.nickname}
                onClick={() => setMenuOpen(!menuOpen)}
              />
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 2000,
                    minWidth: "120px",
                  }}
                >
                  <button
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate("/profile")}
                  >
                    내 프로필
                  </button>
                  <button
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={handleLogout}
                  >
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
