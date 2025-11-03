// src/features/account/AccountLayout.jsx
import { Routes, Route, NavLink } from "react-router-dom";
import "./AccountLayout.css"; // 계정관리 공통 스타일
import AccountSettings from "./AccountSettings";
import ChangePassword from "./ChangePassword";

export default function AccountLayout() {
  return (
    <div className="account-layout">
      {/* 왼쪽 사이드바 */}
      <aside className="account-sidebar">
        <h3>계정 관리</h3>
        <ul>
          <li>
            <NavLink
              to="settings"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              개인정보 수정
            </NavLink>
          </li>
          <li>
            <NavLink
              to="change-password"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              비밀번호 변경
            </NavLink>
          </li>
          <li>
          </li>
        </ul>
      </aside>

      {/* 오른쪽 메인 영역 */}
      <main className="account-content">
        <Routes>
          <Route path="settings" element={<AccountSettings />} />
          <Route path="change-password" element={<ChangePassword />} />
          {/* 향후 알림 설정 페이지 연결 예정 */}
        </Routes>
      </main>
    </div>
  );
}
