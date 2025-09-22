import { useState } from "react";

function App() {
  const [msg, setMsg] = useState("아직 요청 전");

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
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Team Project Frontend</h1>
      <p>React (Vite) 실행 확인용 화면</p>
      <button onClick={testApi}>백엔드 연결 테스트</button>
      <p>{msg}</p>
    </div>
  );
}

export default App;