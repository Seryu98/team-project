// App.jsx
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import RecipeCreate from "./features/project_post/RecipeCreate";
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";

function App() {
  const [msg, setMsg] = useState("아직 요청 전");

  // ✅ API 연결 테스트 함수
  const testApi = () => {
    fetch(import.meta.env.VITE_API_BASE_URL + "/api/hello")
      .then((res) => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then((d) => setMsg(d.message))
      .catch(() => setMsg("API 연결 실패"));
  };

  return (
    <Router>
      {/* ✅ 공통 네비게이션 바 */}
      <Navbar />

      {/* ✅ 라우트 - 메인 페이지만 */}
      <Routes>
        <Route
          path="/"
          element={
            <div style={{ textAlign: "center", marginTop: "50px" }}>
              <h1>Team Project Frontend</h1>
              <p>React (Vite) 실행 확인용 화면</p>
              <button onClick={testApi}>백엔드 연결 테스트</button>
              <p>{msg}</p>
            </div>
          }
        />
      </Routes>
    </Router>
    <Router>
      <Routes>
        {/* 메인 → 게시판 이동 버튼만 있음 */}
        <Route
          path="/"
          element={
            <div style={{ textAlign: "center", marginTop: "50px" }}>
              <h1>홈 화면</h1>
              <p>Team Project Frontend</p>
              <button
                style={{ padding: "10px 20px", marginTop: "20px" }}
                onClick={() => (window.location.href = "/posts")}
              >
                게시판 가기
              </button>
            </div>
          }
        />

        {/* 게시판 */}
        <Route path="/posts" element={<ProjectPostList />} />

        {/* 모집공고 생성 */}
        <Route path="/recipe/create" element={<RecipeCreate />} />

        {/* 모집공고 상세 */}
        <Route path="/recipe/:postId" element={<ProjectPostDetail />} />
      </Routes>
    </Router>
  );
}


export default App;

