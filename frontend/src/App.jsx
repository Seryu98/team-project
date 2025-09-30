// 메인 App 컴포넌트 
// - 현재는 알림 페이지를 기본 화면으로 연결

import NotificationsPage from "./pages/NotificationsPage";

// ✅ 추가 import
import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import ApplicationsPage from "./pages/ApplicationsPage";

// ✅ 추가 import (리더/지원자 전용 라우트에서 직접 사용)
import ApplicationForm from "./components/applications/ApplicationForm";
import ApplicationList from "./components/applications/ApplicationList";

// ✅ 추가: URL의 :postId를 읽어 Form만 렌더하는 래퍼
function PostApplyRoute() {
  const { postId } = useParams();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">지원서 작성</h1>
      <ApplicationForm postId={Number(postId)} />
    </div>
  );
}

// ✅ 추가: URL의 :postId를 읽어 List만 렌더하는 래퍼(리더/관리용)
function PostApplicationsRoute() {
  const { postId } = useParams();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">지원 관리</h1>
      <ApplicationList postId={Number(postId)} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 기존 알림 페이지 (기본 화면) */}
        <Route path="/" element={<NotificationsPage />} />

        {/* ✅ 추가: 지원 관리 페이지(폼+리스트 동시 페이지) */}
        <Route path="/applications" element={<ApplicationsPage />} />

        {/* ✅ 추가: 지원자용 — 특정 게시글에 지원서 작성 */}
        <Route path="/posts/:postId/apply" element={<PostApplyRoute />} />

        {/* ✅ 추가: 리더/관리용 — 특정 게시글 지원서 검토/승인·거절 */}
        <Route path="/posts/:postId/applications" element={<PostApplicationsRoute />} />
      </Routes>
    </Router>
  );
}

export default App;
