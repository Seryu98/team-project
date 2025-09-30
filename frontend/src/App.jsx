// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RecipeCreate from "./features/project_post/RecipeCreate";
import ProjectPostList from "./features/project_post/ProjectPostList";
import ProjectPostDetail from "./features/project_post/ProjectPostDetail";

function App() {
  return (
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
