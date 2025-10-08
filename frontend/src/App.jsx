// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";

// ---------------------------------------
// 공용 컴포넌트
// ---------------------------------------
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import SessionExpiredModal from "./components/SessionExpiredModal";

// ---------------------------------------
// Auth
// ---------------------------------------
import { clearTokens } from "./features/auth/api";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import FindAccount from "./features/auth/FindAccount"; // ✅ 아이디/비밀번호 찾기

// ---------------------------------------
// Profile
// ---------------------------------------
import ProfilePage from "./features/profile/profile_pages";
import ProfileCreate from "./features/profile/profileCreate_pages";

// ---------------------------------------
// Account
// ---------------------------------------
import AccountSettings from "./features/account/AccountSettings";
import AccountLayout from "./features/account/AccountLayout";

// ---------------------------------------
// 프로젝트/스터디 게시판
// ---------------------------------------
import RecipeCreate from "./features/project_post/RecipeCreate";
import RecipeEdit from "./features/project_post/RecipeEdit";
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";

// ---------------------------------------
// 유저 게시판
// ---------------------------------------
import BoardListPage from "./features/board/BoardListPage";
import BoardDetailPage from "./features/board/BoardDetailPage";
import BoardCreatePage from "./features/board/BoardCreatePage";
import BoardEditPage from "./features/board/BoardEditPage";

// ---------------------------------------
// 🏠 홈 페이지
// ---------------------------------------
function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>홈 화면</h1>
      <p>Team Project Frontend</p>
    </div>
  );
}

// ---------------------------------------
// 🧭 랭킹 (유지) 나중에 랭킹코드 만들면 없애고 아래 라우트수정
// ---------------------------------------
function Ranking() {
  return <div style={{ padding: 24 }}>랭킹게시판 (준비중)</div>;
}

// ---------------------------------------
// 🧩 레이아웃
// ---------------------------------------
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

// ---------------------------------------
// 🚀 App 컴포넌트
// ---------------------------------------
export default function App() {
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    // ✅ 세션 만료 처리
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
        </Route>

        {/* ✅ Navbar 포함된 그룹 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />

          {/* ---------------------------------------
              🔹 프로젝트/스터디 게시판
          --------------------------------------- */}
          <Route path="/posts" element={<ProjectPostList />} />
          <Route path="/recipe/:postId" element={<ProjectPostDetail />} />
          <Route
            path="/recipe/create"
            element={
              <ProtectedRoute>
                <RecipeCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipe/:postId/edit"
            element={
              <ProtectedRoute>
                <RecipeEdit />
              </ProtectedRoute>
            }
          />

          {/* ---------------------------------------
              ✅ 유저 게시판
          --------------------------------------- */}
          <Route path="/board" element={<BoardListPage />} />
          <Route path="/board/:id" element={<BoardDetailPage />} />
          <Route
            path="/board/write"
            element={
              <ProtectedRoute>
                <BoardCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:postId/edit"
            element={
              <ProtectedRoute>
                <BoardEditPage />
              </ProtectedRoute>
            }
          />

          {/* ---------------------------------------
              🧭 랭킹 (유지)
          --------------------------------------- */}
          <Route path="/ranking" element={<Ranking />} />

          {/* ---------------------------------------
              🔒 프로필 관련
          --------------------------------------- */}
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/create"
            element={
              <ProtectedRoute>
                <ProfileCreate />
              </ProtectedRoute>
            }
          />

          {/* ---------------------------------------
              ✅ 계정 관리 (중첩 라우트)
          --------------------------------------- */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="settings" replace />} />
            <Route path="settings" element={<AccountSettings />} />
          </Route>
        </Route>
      </Routes>

      {/* ⏰ 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}
    </Router>
  );
}
