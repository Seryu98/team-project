import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import RecipeCreate from "./features/project_post/RecipeCreate";
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionExpiredModal from "./components/SessionExpiredModal";
import { clearTokens } from "./features/auth/api"; // ✅ 세션 만료 대응

// pages
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";

function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>홈 화면</h1>
      <p>Team Project Frontend</p>
      <button onClick={testApi}>백엔드 연결 테스트</button>
      <p>{msg}</p>
      <button
        style={{ padding: "10px 20px", marginTop: "20px" }}
        onClick={() => (window.location.href = "/posts")}
      >
        게시판 가기
      </button>
    </div>
  );
}

// 🔹 게시판 페이지들
function Board() {
  return <div style={{ padding: 24 }}>유저게시판 (준비중)</div>;
}
function Ranking() {
  return <div style={{ padding: 24 }}>랭킹게시판 (준비중)</div>;
}
function Profile() {
  return <div style={{ padding: 24 }}>내 프로필 (준비중)</div>;
}

// ✅ 레이아웃 1: Navbar 포함
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

// ✅ 레이아웃 2: Navbar 없음
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
        </Route>

        {/* Navbar 있는 그룹 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />

          {/* 🔹 조회는 누구나 가능 */}
          <Route path="/posts" element={<ProjectPostList />} />
          <Route path="/recipe/:postId" element={<ProjectPostDetail />} />

          {/* 🔹 로그인 필요 */}
          <Route
            path="/board"
            element={
              <ProtectedRoute>
                <Board />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ranking"
            element={
              <ProtectedRoute>
                <Ranking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipe/create"
            element={
              <ProtectedRoute>
                <RecipeCreate />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>

      {/* ✅ 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}
    </Router>
  );
}
