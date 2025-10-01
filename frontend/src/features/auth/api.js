const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// --- 토큰/세션 타이머 관리 ---
let logoutTimer = null;
let lastActivityTime = Date.now();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분 (서버와 동일하게 설정)

// --- 토큰 헬퍼 ---
function getAccessToken() {
  return localStorage.getItem("access_token");
}
function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}
function setTokens({ access_token, refresh_token, expires_in }) {
  if (access_token) localStorage.setItem("access_token", access_token);
  if (refresh_token) localStorage.setItem("refresh_token", refresh_token);

  if (expires_in) {
    // Access Token 만료 기반 타이머
    startLogoutTimer(expires_in * 1000);
  }
}

// ✅ redirect 헬퍼 (무한 루프 방지)
function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  stopLogoutTimer();
  redirectToLogin();
}

// --- 자동 로그아웃 타이머 ---
function startLogoutTimer(durationMs) {
  stopLogoutTimer(); // 기존 타이머 초기화
  logoutTimer = setTimeout(() => {
    console.log("⏰ 세션 만료로 자동 로그아웃 실행");
    clearTokens();
  }, durationMs);

  // 사용자 활동 감지 (키보드/마우스)
  window.onmousemove = resetActivityTimer;
  window.onkeydown = resetActivityTimer;
}
function stopLogoutTimer() {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }
}
function resetActivityTimer() {
  const now = Date.now();
  if (now - lastActivityTime > 1000) {
    lastActivityTime = now;
    stopLogoutTimer();
    startLogoutTimer(SESSION_TIMEOUT_MS);
  }
}

// --- 회원가입 ---
export async function register(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("회원가입 실패");
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

  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  setTokens(data);
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
  setTokens(data);
  return data.access_token;
}

// --- API 요청 wrapper ---
export async function authFetch(url, options = {}) {
  let token = getAccessToken();

  let res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    } catch {
      clearTokens();
      throw new Error("세션 만료");
    }
  }

  if (!res.ok) throw new Error("API 요청 실패");
  return res.json();
}

// --- 현재 로그인된 사용자 ---
export async function getCurrentUser() {
  return authFetch("/auth/me", { method: "GET" });
}

// --- 로그인 + 사용자 정보까지 한 번에 ---
export async function loginAndFetchUser(loginId, password) {
  const tokens = await login(loginId, password);
  const user = await getCurrentUser();
  return { tokens, user };
}
