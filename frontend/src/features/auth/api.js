// src/features/auth/api.js
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// --- 토큰/세션 타이머 관리 ---
let logoutTimer = null;
let lastActivityTime = Date.now();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분 (테스트 시 1분 등으로 조정)

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
    startLogoutTimer(expires_in * 1000);
  }
}

// ✅ redirect 헬퍼
function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ✅ 토큰 클리어
// redirect: "always" | "never" | "auto"
export function clearTokens(redirect = "always") {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  stopLogoutTimer();

  if (redirect === "always") {
    redirectToLogin();
  } else if (redirect === "auto") {
    const currentPath = window.location.pathname;
    const protectedPaths = [
      "/board",
      "/ranking",
      "/profile",
      "/recipe/create",
      "/account",
    ];
    if (protectedPaths.some((path) => currentPath.startsWith(path))) {
      redirectToLogin();
    }
  }
}

// --- 자동 로그아웃 타이머 ---
function startLogoutTimer(durationMs) {
  stopLogoutTimer();

  let remainingSec = Math.floor(durationMs / 1000);
  console.log(`⏳ 세션 타이머 시작: ${remainingSec}초`);

  logoutTimer = setInterval(() => {
    remainingSec -= 1;
    if (remainingSec > 0) {
      console.log(`⏳ 세션 남은 시간: ${remainingSec}초`);
    } else {
      console.log("⏰ 세션 만료 → 모달 호출");
      stopLogoutTimer();
      localStorage.setItem("session_expired", "true");
      window.dispatchEvent(new Event("sessionExpired"));
    }
  }, 1000);

  window.onmousemove = resetActivityTimer;
  window.onkeydown = resetActivityTimer;
}
function stopLogoutTimer() {
  if (logoutTimer) {
    clearInterval(logoutTimer);
    logoutTimer = null;
  }
}
function resetActivityTimer() {
  const now = Date.now();
  if (now - lastActivityTime > 1000) {
    lastActivityTime = now;
    console.log("🔄 사용자 활동 감지 → 세션 연장");
    stopLogoutTimer();
    startLogoutTimer(SESSION_TIMEOUT_MS);
  }
}

// ============================
// 회원가입
// ============================
export async function register(data) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("회원가입 실패");
  return res.json();
}

// ============================
// 로그인 (username=user_id)
// ============================
export async function login(loginId, password) {
  const params = new URLSearchParams();
  params.append("username", loginId);
  params.append("password", password);
  params.append("grant_type", "password");
   params.append("scope", "");

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("로그인 에러:", res.status, errorText);
    throw new Error(String(res.status));
  }
  
  const data = await res.json();
  setTokens(data);
  return data;
}

// ============================
// Refresh Access Token
// ============================
export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("리프레시 토큰 없음");

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearTokens("always");
    throw new Error("리프레시 토큰 만료");
  }

  const data = await res.json();
  setTokens(data);
  return data.access_token;
}

// ============================
// API 요청 wrapper
// ============================
export async function authFetch(url, options = {}, { skipRedirect = false } = {}) {
  let token = getAccessToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    try {
      token = await refreshAccessToken();
      const retryHeaders = { ...(options.headers || {}) };
      if (!(options.body instanceof FormData) && !retryHeaders["Content-Type"]) {
        retryHeaders["Content-Type"] = "application/json";
      }
      retryHeaders["Authorization"] = `Bearer ${token}`;
      res = await fetch(`${API_URL}${url}`, { ...options, headers: retryHeaders });
    } catch {
      if (!skipRedirect) clearTokens("always");
      else clearTokens("never");
      throw new Error("세션 만료");
    }
  }

  if (!res.ok) throw new Error("API 요청 실패");
  return res.json();
}

// ============================
// 현재 로그인된 사용자
// ============================
export async function getCurrentUser({ skipRedirect = false } = {}) {
  return authFetch("/auth/me", { method: "GET" }, { skipRedirect });
}

// ============================
// 로그인 + 사용자 정보까지 한 번에
// ============================
export async function loginAndFetchUser(loginId, password) {
  const tokens = await login(loginId, password);
  const user = await getCurrentUser();
  return { tokens, user };
}

// ============================
// 아이디 / 비밀번호 찾기 관련
// ============================

// --- 아이디 찾기 ---
export async function findUserId(name, phone) {
  const res = await fetch(`${API_URL}/auth/find-id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone_number: phone }),
  });
  if (!res.ok) throw new Error("아이디 찾기 실패");
  return res.json();
}

// --- 이메일 힌트 조회 ---
export async function getEmailHint(user_id) {
  const res = await fetch(`${API_URL}/auth/email-hint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  if (!res.ok) throw new Error("이메일 힌트 조회 실패");
  return res.json();
}

// --- 비밀번호 재설정 요청 ---
export async function requestPasswordReset(user_id) {
  const res = await fetch(`${API_URL}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  if (!res.ok) throw new Error("비밀번호 재설정 요청 실패");
  return res.json();
}

// --- 비밀번호 재설정 실행 ---
export async function resetPassword(reset_token, new_password) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset_token, new_password }),
  });
  if (!res.ok) throw new Error("비밀번호 재설정 실패");
  return res.json();
}

// --- 이메일 인증코드 발송 ---
export async function sendVerificationCode(email) {
  const res = await fetch(`${API_URL}/auth/send-verification-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("인증코드 발송 실패");
  return res.json(); // { message, test_code }
}

// --- 이메일 인증코드 검증 ---
export async function verifyCode(email, code) {
  const res = await fetch(`${API_URL}/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error("인증코드 검증 실패");
  return res.json(); // { message: "인증 성공" }
}

// ============================
// 계정 관리
// ============================
export async function updateAccount(data) {
  return authFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAccount() {
  return authFetch("/auth/delete-account", {
    method: "DELETE",
  });
}
