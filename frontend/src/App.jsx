import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

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

  );
}
export default App;

