import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionExpiredModal from "./components/SessionExpiredModal";
import { clearTokens } from "./features/auth/api"; // ✅ 추가

// pages
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import FindAccount from "./features/auth/FindAccount"; // ✅ 추가

function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>Team Project Frontend</h1>
      <p>홈 화면 (누구나 접근 가능)</p>
    </div>
  );
}
function Posts() { return <div style={{ padding: 24 }}>프로젝트/스터디 게시판</div>; }
function Board() { return <div style={{ padding: 24 }}>유저게시판</div>; }
function Ranking() { return <div style={{ padding: 24 }}>랭킹게시판</div>; }
function Profile() { return <div style={{ padding: 24 }}>내 프로필</div>; }

function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
function AuthLayout() {
  return <Outlet />;
}

export default function App() {
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    // 🚩 새로고침 시 세션 만료 플래그 확인
    if (localStorage.getItem("session_expired") === "true") {
      localStorage.removeItem("session_expired");
      clearTokens(true); // 토큰 제거 + 로그인으로 강제 이동
    }

    const handleExpire = () => setShowSessionModal(true);
    window.addEventListener("sessionExpired", handleExpire);
    return () => window.removeEventListener("sessionExpired", handleExpire);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Navbar 없는 그룹 */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-account" element={<FindAccount />} /> {/* ✅ 추가 */}
        </Route>

        {/* Navbar 있는 그룹 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
          <Route path="/board" element={<ProtectedRoute><Board /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Route>
      </Routes>

      {/* ✅ 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}
    </Router>
  );
}
