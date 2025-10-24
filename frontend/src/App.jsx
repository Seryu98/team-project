// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
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
import { clearTokens, getCurrentUser } from "./features/auth/api";
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
  const [forceLogout, setForceLogout] = useState(false);
  const [forceMessage, setForceMessage] = useState("");
  const wsRef = useRef(null);
  const isWsConnected = useRef(false); // ✅ 중복 연결 방지용 ref

  useEffect(() => {
    // ✅ 세션 만료 처리
    if (localStorage.getItem("session_expired") === "true") {
      localStorage.removeItem("session_expired");
      setForceLogout(true);
      setForceMessage("⚠️ 다른 기기에서 로그인되어 자동 로그아웃됩니다.");
    }

    const handleExpire = () => setShowSessionModal(true);
    window.addEventListener("sessionExpired", handleExpire);

    // ✅ WebSocket 단일 로그인 감지
    const setupWebSocket = async () => {
      try {
        // 로그인 여부 확인 (리디렉션 방지)
        const user = await getCurrentUser({ skipRedirect: true });
        if (!user || isWsConnected.current) return;

        const API_BASE =
          import.meta.env.VITE_API_BASE_URL ||
          import.meta.env.VITE_API_BASE ||
          "http://localhost:8000";
        const ws = new WebSocket(
          `${API_BASE.replace("http", "ws")}/notifications/ws/${user.id}`
        );
        wsRef.current = ws;
        isWsConnected.current = true;

        ws.onopen = () => {
          console.log("📡 WebSocket 연결됨:", user.id);
          ws.send(JSON.stringify({ type: "PING" }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("💬 WebSocket 수신:", data);

            // ✅ 서버/클라이언트 모두 대응: FORCE_LOGOUT 또는 FORCED_LOGOUT
            if (data.type === "FORCED_LOGOUT" || data.type === "FORCE_LOGOUT") {
              console.warn("🚨 다른 기기에서 로그인됨 → 자동 로그아웃");

              // ✅ 모달용 메시지 저장
              setForceMessage(
                data.message ||
                  "⚠️ 다른 기기에서 로그인되어 자동 로그아웃됩니다."
              );

              // ✅ 토큰 삭제 (리다이렉트 X)
              clearTokens("never");

              // ✅ 모달 표시 (사용자 확인 후 이동)
              setForceLogout(true);
            }
          } catch (err) {
            console.error("❌ WebSocket 메시지 파싱 실패:", err);
          }
        };

        ws.onclose = (e) => {
          console.log("🔌 WebSocket 연결 종료:", e.reason);
          isWsConnected.current = false;

          // ✅ 추가: 서버가 code=4001로 닫은 경우에도 모달 표시
          if (e.code === 4001) {
            setForceMessage("⚠️ 다른 기기에서 로그인되어 자동 로그아웃됩니다.");
            setForceLogout(true);
          }
        };
      } catch (err) {
        console.warn("WebSocket 초기화 실패:", err);
      }
    };

    setupWebSocket();

    return () => {
      window.removeEventListener("sessionExpired", handleExpire);
      if (wsRef.current) {
        wsRef.current.close();
        isWsConnected.current = false;
      }
    };
  }, []);

  return (
    <>
      <Router>
        <Routes>
          {/* ✅ Navbar 없는 그룹 */}
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
            <Route path="/search" element={<SearchPage />} />
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
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/users/ranking" element={<UserRanking />} />
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
            <Route
              path="/messages/*"
              element={
                <ProtectedRoute>
                  <MessagesPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Router>

      {/* ✅ 세션 만료 모달 */}
      {showSessionModal && (
        <SessionExpiredModal onClose={() => setShowSessionModal(false)} />
      )}

      {/* ✅ 중복 로그인 감지 모달 */}
      {forceLogout && (
        <SessionExpiredModal
          onClose={() => {
            setForceLogout(false);
            clearTokens("never");
            window.location.replace("/login");
          }}
          message={forceMessage}
        />
      )}
    </>
  );
}
