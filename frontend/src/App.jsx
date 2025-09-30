import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import RecipeCreate from "./features/project_post/RecipeCreate";
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";
import ProtectedRoute from "./components/ProtectedRoute";

// pages
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";

// 임시 페이지들
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
          <Route path="/posts" element={<ProjectPostList />} />
          <Route path="/board" element={<Board />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/profile" element={<Profile />} />

          {/* 모집공고 관련 */}
          <Route
            path="/recipe/create"
            element={
              <ProtectedRoute>
                <RecipeCreate />
              </ProtectedRoute>
            }
          />
          <Route path="/recipe/:postId" element={<ProjectPostDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}
