import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import RecipeCreate from "./features/project_post/RecipeCreate";
import ProjectPostList from "./features/project_post/ProjectPostList";

function App() {
  return (
    <Router>
      <Routes>
        {/* 메인 화면 */}
        <Route
          path="/"
          element={
            <div style={{ textAlign: "center", marginTop: "50px" }}>
              <h1>홈 화면</h1>
              <p>Team Project Frontend</p>
              <Link to="/recipe/list">
                <button style={{ padding: "10px 20px", marginTop: "20px" }}>
                  게시판 이동
                </button>
              </Link>
            </div>
          }
        />

        {/* 게시판 */}
        <Route path="/recipe/list" element={<ProjectPostList />} />

        {/* 모집공고 생성 */}
        <Route path="/recipe/create" element={<RecipeCreate />} />

        {/* 잘못된 주소 → 메인으로 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;