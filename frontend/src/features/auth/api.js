const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// --- 토큰/세션 타이머 관리 ---
let logoutTimer = null;
let lastActivityTime = Date.now();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분 → 테스트 시 1분

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

// ✅ redirect 헬퍼
function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// ✅ 토큰 클리어 (이제 직접 redirect 안함 → 모달/플래그에서 실행)
export function clearTokens(redirect = true) {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  stopLogoutTimer();
  if (redirect) redirectToLogin();
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

      // 🚩 세션 만료 플래그 기록
      localStorage.setItem("session_expired", "true");

      // 🚩 세션 만료 이벤트 발생 (App.jsx에서 모달 띄움)
      window.dispatchEvent(new Event("sessionExpired"));
    }
  }, 1000);

  // 사용자 활동 감지 (키보드/마우스)
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

// --- API 요청 wrapper (수정됨) ---
export async function authFetch(url, options = {}, { skipRedirect = false } = {}) {
  let token = getAccessToken();
  
  // ✅ 헤더 구성 (FormData 체크)
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
  // FormData가 아닐 때만 Content-Type 추가
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    try {
      token = await refreshAccessToken();
      
      // ✅ 재시도 헤더 구성
      const retryHeaders = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      
      if (!(options.body instanceof FormData)) {
        retryHeaders["Content-Type"] = "application/json";
      }
      
      res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: retryHeaders,
      });
    } catch {
      if (!skipRedirect) clearTokens();
      throw new Error("세션 만료");
    }
  }

  if (!res.ok) throw new Error("API 요청 실패");
  return res.json();
}

// --- 현재 로그인된 사용자 ---
export async function getCurrentUser({ skipRedirect = false } = {}) {
  return authFetch("/auth/me", { method: "GET" }, { skipRedirect });
}

// --- 로그인 + 사용자 정보까지 한 번에 ---
export async function loginAndFetchUser(loginId, password) {
  const tokens = await login(loginId, password);
  const user = await getCurrentUser();
  return { tokens, user };
}