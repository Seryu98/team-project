// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import RecipeCreate from "./features/project_post/RecipeCreate";
import RecipeEdit from "./features/project_post/RecipeEdit";  // ✅ 추가
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionExpiredModal from "./components/SessionExpiredModal";
import { clearTokens } from "./features/auth/api";
import ProfilePage from "./features/profile/profile_pages";
import ProfileCreate from "./features/profile/profileCreate_pages";

// pages
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";

import FindAccount from "./features/auth/FindAccount"; // ✅ 아이디/비밀번호 찾기
import AccountSettings from "./features/account/AccountSettings";
import AccountLayout from "./features/account/AccountLayout";


// 홈
function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>홈 화면</h1>
      <p>Team Project Frontend</p>
    </div>
  );
}

// 🔹 게시판 페이지들 (준비중)
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


// ✅ 레이아웃 2: Navbar 없음 (로그인/회원가입/아이디찾기 전용)
function AuthLayout() {
  return <Outlet />;
}

export default function App() {
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("session_expired") === "true") {
      localStorage.removeItem("session_expired");
      clearTokens("auto");
    }

    const handleExpire = () => setShowSessionModal(true);
    window.addEventListener("sessionExpired", handleExpire);
    return () => window.removeEventListener("sessionExpired", handleExpire);
  }, []);

  return (
    <Router>
      <Routes>
        {/* ✅ Navbar 없는 그룹 (로그인/회원가입/아이디찾기) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/find-account" element={<FindAccount />} />
          <Route path="/find-account" element={<FindAccount />} /> {/* ✅ 아이디/비번 찾기 */}

        </Route>

        {/* ✅ Navbar 있는 그룹 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />

          {/* 🔹 조회는 누구나 가능 */}
          <Route path="/posts" element={<ProjectPostList />} />
          <Route path="/recipe/:postId" element={<ProjectPostDetail />} />
          <Route path="/board" element={<Board />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />

          {/* 🔹 로그인 필요 - 내 프로필 */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* 🔹 로그인 필요 - 프로필 수정 */}
          <Route
            path="/profile/create"
            element={
              <ProtectedRoute>
                <ProfileCreate />
              </ProtectedRoute>
            }
          />

          {/* 🔹 로그인 필요 - 모집공고 생성 */}
          <Route
            path="/recipe/create"
            element={
              <ProtectedRoute>
                <RecipeCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recipe/:postId/edit"   // ✅ 수정 페이지 라우트 추가
            element={
              <ProtectedRoute>
                <RecipeEdit />
              </ProtectedRoute>
            }
          />

          {/* ✅ 계정 관리 (중첩 라우트) */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountLayout />
              </ProtectedRoute>
            }
          >
            {/* 기본 접속 시 /account/settings로 리다이렉트 */}
            <Route index element={<Navigate to="settings" replace />} />
            <Route path="settings" element={<AccountSettings />} />
            {/* 필요 시 확장 */}
            {/* <Route path="password" element={<PasswordChange />} /> */}
            {/* <Route path="notifications" element={<NotificationSettings />} /> */}
          </Route>
        </Route>
      </Routes>

      {/* 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}
    </Router>
  );
}