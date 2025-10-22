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

// ✅ 추가: 전역 세션 감시기
import SessionManager from "./features/auth/SessionManager";

// ---------------------------------------
// Auth
// ---------------------------------------
import { clearTokens } from "./features/auth/api";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import FindAccount from "./features/auth/FindAccount";
import SocialCallback from "./features/auth/SocialCallback";

// ---------------------------------------
// Profile
// ---------------------------------------
import ProfilePage from "./features/profile/profile_pages";
import ProfileCreate from "./features/profile/profileCreate_pages";
import ProfileTutorial from "./features/profile/ProfileTutorial";
import UserRanking from "./features/users/UserRanking";

// ---------------------------------------
// 프로젝트/스터디 게시판
// ---------------------------------------
import RecipeCreate from "./features/project_post/RecipeCreate";
import RecipeEdit from "./features/project_post/RecipeEdit";
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";

// ---------------------------------------
// 계정관리
// ---------------------------------------
import AccountSettings from "./features/account/AccountSettings";
import AccountLayout from "./features/account/AccountLayout";
import ChangePassword from "./features/account/ChangePassword";

// ---------------------------------------
// 유저 게시판
// ---------------------------------------
import BoardListPage from "./features/board/BoardListPage";
import BoardDetailPage from "./features/board/BoardDetailPage";
import BoardCreatePage from "./features/board/BoardCreatePage";
import BoardEditPage from "./features/board/BoardEditPage";

// ---------------------------------------
// 알림, 메시지, 관리자 페이지
// ---------------------------------------
import AdminDashboard from "./features/admin/AdminDashboard";
import MessageDetail from "./features/message/MessageDetail";
import MessagesPage from "./features/message/MessagePage"; 
import AdminPendingPage from "./features/admin/AdminPendingPage";
import AdminReportsPage from "./features/admin/AdminReportsPage";
import AdminUsersPage from "./features/admin/AdminUsersPage.jsx";

// ---------------------------------------
// 🏠 홈 페이지
// ---------------------------------------
import HomePage from "./features/home/HomePage";

// ---------------------------------------
// 통합 검색창
// ---------------------------------------
import SearchPage from "./features/search/SearchPage";

// ---------------------------------------
// 🧭 랭킹 (placeholder 유지)
// ---------------------------------------
function Ranking() {
  return <div style={{ padding: 24 }}>랭킹게시판 (준비중)</div>;
}

// ---------------------------------------
// 🧩 레이아웃 1: Navbar 포함
// ---------------------------------------
function MainLayout() {
  return (
    <>
      <Navbar />
      {/* ✅ 전역 세션 감시기: FORCED_LOGOUT 수신/처리 */}
      <SessionManager />
      <Outlet />
    </>
  );
}

// ---------------------------------------
// 레이아웃 2: Navbar 없음
// ---------------------------------------
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
        {/* ✅ Navbar 없는 그룹 (로그인/회원가입/아이디찾기/소셜콜백/튜토리얼) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-account" element={<FindAccount />} />
          <Route path="/social/callback" element={<SocialCallback />} />
          <Route path="/tutorial" element={<ProfileTutorial />} />
        </Route>

        {/* ✅ Navbar 포함된 그룹 */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />

          {/* ---------------------------------------
              🔍 통합 검색
          --------------------------------------- */}
          <Route path="/search" element={<SearchPage />} />

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
              🧭 랭킹 + 유저 랭킹 페이지
          --------------------------------------- */}
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/users/ranking" element={<UserRanking />} />

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
            <Route path="change-password" element={<ChangePassword />} />
          </Route>

          {/* ---------------------------------------
              ✅ 관리자 대시보드
          --------------------------------------- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pending"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPendingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          {/* ✅ 수정: 기존 MessageInbox → MessagesPage로 교체 */}
          <Route
            path="/messages/*"
            element={
              <ProtectedRoute>
                <MessagesPage /> {/* ← 삼분할 쪽지함 전체 페이지 */}
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>

      {/* ⏰ 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}
    </Router>
  );
}
