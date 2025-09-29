import { useState } from "react";
import { login, getCurrentUser } from "./api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 로그인 요청 → 토큰 저장
      const res = await login(email, password);
      localStorage.setItem("token", res.access_token);

      // 저장된 토큰으로 사용자 정보 조회
      const user = await getCurrentUser();
      setMsg(`✅ 로그인 성공! 환영합니다, ${user.nickname} (${user.role})`);
    } catch (err) {
      setMsg("❌ 로그인 실패");
    }
  };

  return (
    <div>
      <h2>로그인</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">로그인</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}

export default Login;