// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";

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

// ✅ 레이아웃 1: Navbar 포함(일반 화면)
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

// ✅ 레이아웃 2: Navbar 없음(로그인/회원가입 등)
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
          <Route path="/posts" element={<Posts />} />
          <Route path="/board" element={<Board />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}
