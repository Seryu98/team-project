import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Register from "./features/auth/Register";
import Login from "./features/auth/Login";
import { useState } from "react";

function App() {
  const [msg, setMsg] = useState("아직 요청 전");

  // API 연결 테스트용
  const testApi = () => {
    fetch(import.meta.env.VITE_API_BASE_URL + "/api/hello")
      .then(res => {
        if (!res.ok) throw new Error("API Error");
        return res.json();
      })
      .then(d => setMsg(d.message))
      .catch(() => setMsg("API 연결 실패"));
  };

  return (
    <Router>
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <h1>Team Project Frontend</h1>
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/register" style={{ margin: "0 10px" }}>회원가입</Link>
          <Link to="/login" style={{ margin: "0 10px" }}>로그인</Link>
          <button onClick={testApi} style={{ marginLeft: "20px" }}>
            백엔드 연결 테스트
          </button>
        </nav>
        <p>{msg}</p>

        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;