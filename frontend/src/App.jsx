import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import RecipeCreate from "./features/project_post/RecipeCreate";
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
import FindAccount from "./features/auth/FindAccount";

function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>홈 화면</h1>
      <p>Team Project Frontend</p>
    </div>
  );
}
function Board() { return <div style={{ padding: 24 }}>유저게시판</div>; }
function Ranking() { return <div style={{ padding: 24 }}>랭킹게시판</div>; }

// 레이아웃: Navbar 포함
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
        {/* Navbar 없는 그룹 */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-account" element={<FindAccount />} />
        </Route>

        {/* Navbar 있는 그룹 */}
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
        </Route>
      </Routes>

      {/* 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}
    </Router>
  );
}