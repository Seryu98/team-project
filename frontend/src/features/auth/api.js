// src/features/auth/api.js
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// 회원가입 그대로
export async function register(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("회원가입 실패");
  return res.json();
}

// ✅ 로그인: 아이디로 로그인 (username=user_id)
export async function login(loginId, password) {
  const params = new URLSearchParams();
  params.append("username", loginId);   // <-- 여기!
  params.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("토큰 없음");

  const res = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("유저 정보 조회 실패");
  return res.json();
}
