// src/features/auth/api.js
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// --- 토큰 헬퍼 ---
function getAccessToken() {
  return localStorage.getItem("access_token");
}
function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}
function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem("access_token", access_token);
  if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// --- 회원가입 ---
export async function register(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`회원가입 실패: ${err}`);
  }
  return res.json();
}

// --- 로그인 (username=user_id) ---
export async function login(loginId, password) {
  const params = new URLSearchParams();
  params.append("username", loginId);
  params.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`로그인 실패: ${res.status} ${err}`);
  }
  const data = await res.json();
  setTokens(data); // ✅ 토큰 저장
  return data;
}

// --- Refresh Access Token ---
export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("리프레시 토큰 없음");

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error("리프레시 토큰 만료");
  }

  const data = await res.json();
  setTokens(data); // ✅ 새 access/refresh 토큰 저장
  return data.access_token;
}

// --- API 요청 wrapper (자동 갱신) ---
export async function authFetch(url, options = {}) {
  let token = getAccessToken();

  let res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (res.status === 401) {
    try {
      token = await refreshAccessToken();
      res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      clearTokens();
      throw new Error("세션 만료");
    }
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 요청 실패: ${res.status} ${err}`);
  }

  return res.json();
}

// --- 현재 로그인된 사용자 ---
export async function getCurrentUser() {
  return authFetch("/auth/me", { method: "GET" });
}