// src/features/auth/api.js
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// --- 토큰/세션 타이머 관리 ---
let logoutTimer = null;
let lastActivityTime = Date.now();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분

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
  if (expires_in) startLogoutTimer(expires_in * 1000);
}

// ✅ redirect 헬퍼
function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ✅ 토큰 클리어
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
    if (remainingSec <= 0) {
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
// ✅ 회원가입 (서버 detail 그대로 전달)
// ============================
export async function register(form) {
  const payload = {
    email: form.email,
    user_id: form.user_id,
    password: form.password,
    password_confirm: form.passwordConfirm, // ✅ 백엔드에서 요구하는 필드
    name: form.name,
    nickname: form.nickname,
    phone_number: form.phone_number || null,
  };

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // ✅ 서버 detail 메시지를 그대로 추출
    let errorMsg = "회원가입 실패";
    try {
      const data = await res.json();
      if (data?.detail) errorMsg = data.detail;
      else if (data?.msg) errorMsg = data.msg;
    } catch {
      errorMsg = await res.text();
    }
    throw new Error(errorMsg);
  }

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
// API 요청 wrapper (수정버전)
// ============================
export async function authFetch(url, options = {}, { skipRedirect = false } = {}) {
  let token = getAccessToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${url}`, { ...options, headers });

  // ✅ 401 → 토큰 재발급 시도
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

  // ✅ 응답 본문(JSON or text) 파싱 시도
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  // ✅ 실패 시 detail 메시지 포함
  if (!res.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.msg ||
      `API 요청 실패 (${res.status} ${res.statusText})`;

    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
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
export async function findUserId(name, phone) {
  const res = await fetch(`${API_URL}/auth/find-id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone_number: phone }),
  });
  if (!res.ok) throw new Error("아이디 찾기 실패");
  return res.json();
}

export async function getEmailHint(user_id) {
  const res = await fetch(`${API_URL}/auth/email-hint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  if (!res.ok) throw new Error("이메일 힌트 조회 실패");
  return res.json();
}

export async function requestPasswordReset(user_id) {
  const res = await fetch(`${API_URL}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });
  if (!res.ok) throw new Error("비밀번호 재설정 요청 실패");
  return res.json();
}

export async function resetPassword(reset_token, new_password) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset_token, new_password }),
  });
  if (!res.ok) throw new Error("비밀번호 재설정 실패");
  return res.json();
}

// ============================
// ✅ 이메일 인증 관련
// ============================

// ✅ 인증 코드 발송
export async function sendVerificationCode(email) {
  const res = await fetch(`${API_URL}/auth/email-verification/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("인증코드 발송 실패:", res.status, text);
    throw new Error("인증코드 발송 실패");
  }
  return res.json();
}

// ✅ 인증 코드 검증
export async function verifyCode(email, code) {
  const res = await fetch(`${API_URL}/auth/email-verification/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("인증코드 검증 실패:", res.status, text);
    throw new Error("인증코드 검증 실패");
  }
  return res.json();
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

// ============================
// ✅ 로그아웃 (서버 + 로컬 세션 종료)
// ============================
export async function logoutUser() {
  try {
    const token = getAccessToken();
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (e) {
    console.warn("⚠️ 서버 로그아웃 요청 실패 (무시 가능):", e);
  } finally {
    clearTokens("always");
  }
}
