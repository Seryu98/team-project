// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ 로그인 보호 추가

// pages
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";

// 임시 페이지 (추후 교체)
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

// ✅ 레이아웃 1: Navbar 포함
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

// ✅ 레이아웃 2: Navbar 없음 (로그인/회원가입)
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

          {/* ✅ 보호된 페이지들 */}
          <Route
            path="/posts"
            element={
              <ProtectedRoute>
                <Posts />
              </ProtectedRoute>
            }
          />
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
        </Route>
      </Routes>
    </Router>
  );
}