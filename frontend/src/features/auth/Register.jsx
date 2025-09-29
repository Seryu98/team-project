import { useState } from "react";
import { register } from "./api";

function Register() {
  const [form, setForm] = useState({
    email: "",
    user_id: "",
    password: "",
    name: "",
    nickname: "",
    phone_number: "",
  });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await register(form);
      setMsg(`✅ 회원가입 성공! (id: ${res.user_id})`);
    } catch (err) {
      setMsg("❌ 회원가입 실패");
    }
  };

  return (
    <div>
      <h2>회원가입</h2>
      <form onSubmit={handleSubmit}>
        <input name="email" placeholder="이메일" value={form.email} onChange={handleChange} />
        <input name="user_id" placeholder="아이디" value={form.user_id} onChange={handleChange} />
        <input name="password" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} />
        <input name="name" placeholder="이름" value={form.name} onChange={handleChange} />
        <input name="nickname" placeholder="닉네임" value={form.nickname} onChange={handleChange} />
        <input name="phone_number" placeholder="전화번호" value={form.phone_number} onChange={handleChange} />
        <button type="submit">가입하기</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}

export default Register;