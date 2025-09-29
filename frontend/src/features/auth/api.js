// 로그인/회원가입/유저 정보 관련 API 함수 모음

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// 회원가입 요청 함수
export async function register(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("회원가입 실패");
  return res.json();
}

// 로그인 요청 함수 (JWT 발급)
export async function login(email, password) {
  const params = new URLSearchParams();
  params.append("username", email); // FastAPI OAuth2PasswordRequestForm은 username 필드를 요구
  params.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) throw new Error("로그인 실패");
  return res.json(); // { access_token, token_type }
}

// 현재 사용자 정보 요청 함수 (/auth/me)
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