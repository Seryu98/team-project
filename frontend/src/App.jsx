// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "./components/Navbar";

// pages
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import NotificationsPage from "./features/notify/NotificationsPage";
import ApplicationsPage from "./features/apply/ApplicationsPage";
import ApplicationForm from "./features/apply/ApplicationForm";
import ApplicationList from "./features/apply/ApplicationList";

// ✅ 쪽지 관련 페이지 import
import MessagesPage from "./pages/MessagesPage";
import MessageDetailPage from "./pages/MessageDetailPage";
import MessageComposePage from "./features/message/MessageComposePage";

// ======================
// 임시/테스트용 페이지들
// ======================
function Home() {
  const [msg, setMsg] = useState("아직 요청 전");
  const testApi = () => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    fetch(base + "/")
      .then((res) => {
        if (!res.ok) throw new Error("API Error");
        return res.text();
      })
      .then(() => setMsg("백엔드 연결 OK"))
      .catch(() => setMsg("API 연결 실패"));
  };
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>Team Project Frontend</h1>
      <p>React (Vite) 실행 확인용 화면</p>
      <button onClick={testApi}>백엔드 연결 테스트</button>
      <p>{msg}</p>
    </div>
  );
}
function Posts() { return <div style={{ padding: 24 }}>프로젝트/스터디 게시판 (준비중)</div>; }
function Board() { return <div style={{ padding: 24 }}>유저게시판 (준비중)</div>; }
function Ranking() { return <div style={{ padding: 24 }}>랭킹게시판 (준비중)</div>; }
function Profile() { return <div style={{ padding: 24 }}>내 프로필 (준비중)</div>; }

// ======================
// 지원 관련 라우트
// ======================
function PostApplyRoute() {
  const { postId } = useParams();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">지원서 작성</h1>
      <ApplicationForm postId={Number(postId)} />
    </div>
  );
}
function PostApplicationsRoute() {
  const { postId } = useParams();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">지원 관리</h1>
      <ApplicationList postId={Number(postId)} />
    </div>
  );
}

// ======================
// 레이아웃
// ======================
function MainLayout({ currentUser, setCurrentUser }) {
  return (
    <>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} />
      <Outlet />
    </>
  );
}
function AuthLayout() {
  return <Outlet />;
}

// ======================
// App 컴포넌트
// ======================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ App 시작 시 로그인 사용자 로드
  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setCurrentUser(null);
          return;
        }
        const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
        const res = await axios.get(`${base}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch (err) {
        setCurrentUser(null);
      }
    }
    fetchUser();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Navbar 없는 그룹 */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Navbar 있는 그룹 */}
        <Route element={<MainLayout currentUser={currentUser} setCurrentUser={setCurrentUser} />}>
          <Route path="/" element={<Home />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/board" element={<Board />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/profile" element={<Profile />} />

          {/* 알림 */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* 지원 관리 */}
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/posts/:postId/apply" element={<PostApplyRoute />} />
          <Route path="/posts/:postId/applications" element={<PostApplicationsRoute />} />

          {/* ✅ 쪽지 라우트 */}
          <Route path="/messages" element={<MessagesPage currentUser={currentUser} />} />
          <Route path="/messages/:id" element={<MessageDetailPage currentUser={currentUser} />} />
          <Route path="/messages/new" element={<MessageComposePage />} />
        </Route>
      </Routes>
    </Router>
  );
}
