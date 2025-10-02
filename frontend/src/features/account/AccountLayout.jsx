// src/features/account/AccountLayout.jsx
import { Outlet, NavLink } from "react-router-dom";
import "./AccountLayout.css"; // 필요시 스타일 분리

export default function AccountLayout() {
  return (
    <div className="account-layout">
      {/* 왼쪽 사이드바 */}
      <aside className="account-sidebar">
        <h3>계정 관리</h3>
        <ul>
          <li>
            <NavLink to="settings">개인정보 수정</NavLink>
          </li>
          <li>
            <NavLink to="password">비밀번호 변경</NavLink>
          </li>
          <li>
            <NavLink to="notifications">알림 설정</NavLink>
          </li>
        </ul>
      </aside>

      {/* 오른쪽 메인 */}
      <main className="account-content">
        <Outlet />
      </main>
    </div>
  );
}
