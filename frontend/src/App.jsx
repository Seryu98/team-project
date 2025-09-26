import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import RecipeCreate from "./pages/RecipeCreate";

function App() {
  return (
    <Router>
      <Routes>
        {/* 홈 화면 */}
        <Route
          path="/"
          element={
            <div style={{ textAlign: "center", marginTop: "50px" }}>
              <h1>홈 화면</h1>
              <p>Team Project Frontend</p>
              <Link to="/recipe/create">
                <button style={{ padding: "10px 20px", marginTop: "20px" }}>
                  모집공고 생성하기
                </button>
              </Link>
            </div>
          }
        />

        {/* 모집공고 생성 페이지 */}
        <Route path="/recipe/create" element={<RecipeCreate />} />
      </Routes>
    </Router>
  );
}

export default App;