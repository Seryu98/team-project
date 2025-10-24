// src/features/admin/AdminUsersPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminUsersPage.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchBanned(); }, []);

  async function fetchBanned() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${API}/admin/banned-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setRows(res.data.data || []);
      } else {
        alert(res.data?.message || "목록 조회 실패");
      }
    } catch (e) {
      console.error(e);
      alert("서버 오류로 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  }

  async function doBan(id, days = null) {
    const reason = prompt(`사유를 입력하세요 (${days === null ? "영구 정지" : `${days}일 정지`}) :`);
    if (reason === null) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(
        `${API}/admin/users/${id}/ban`,
        { days, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        alert(res.data.message || "제재 완료");
        fetchBanned();
      } else {
        alert(res.data?.message || "제재 실패");
      }
    } catch (e) {
      console.error(e);
      alert("서버 오류로 제재 실패");
    }
  }

  async function doBanCustom(id) {
    const input = prompt("정지 일수를 숫자로 입력하세요 (예: 10) — 취소하면 중단");
    if (input === null) return;
    const days = parseInt(input, 10);
    if (Number.isNaN(days) || days <= 0) return alert("유효한 일수를 입력하세요.");
    await doBan(id, days);
  }

  async function doUnban(id) {
    const reason = prompt("해제 사유를 입력하세요:");
    if (reason === null) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(
        `${API}/admin/users/${id}/unban`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        alert(res.data.message || "해제 완료");
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.data?.message || "해제 실패");
      }
    } catch (e) {
      console.error(e);
      alert("서버 오류로 해제 실패");
    }
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <h1 className="admin-users-title">👮 제재 유저 관리</h1>
        <button
          onClick={fetchBanned}
          className="admin-users-refresh-btn"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <p className="admin-users-loading">로딩 중...</p>
      ) : rows.length === 0 ? (
        <p className="admin-users-empty">현재 제재 중인 유저가 없습니다.</p>
      ) : (
        <div className="admin-users-table-container">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>닉네임</th>
                <th>이메일</th>
                <th>상태</th>
                <th>제재 만료</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="admin-users-id">{u.id}</td>
                  <td className="admin-users-nickname">{u.nickname}</td>
                  <td className="admin-users-email">{u.email}</td>
                  <td className="admin-users-status">{u.status}</td>
                  <td className="admin-users-banned-until">
                    {u.banned_until ? new Date(u.banned_until).toLocaleString() : "-"}
                  </td>
                  <td>
                    <div className="admin-users-actions">
                      <button
                        onClick={() => doBan(u.id, 3)}
                        className="admin-users-btn admin-users-btn-3day"
                      >
                        3일
                      </button>
                      <button
                        onClick={() => doBan(u.id, 7)}
                        className="admin-users-btn admin-users-btn-7day"
                      >
                        7일
                      </button>
                      <button
                        onClick={() => doBan(u.id, null)}
                        className="admin-users-btn admin-users-btn-permanent"
                      >
                        영구
                      </button>
                      <button
                        onClick={() => doBanCustom(u.id)}
                        className="admin-users-btn admin-users-btn-custom"
                      >
                        커스텀
                      </button>
                      <button
                        onClick={() => doUnban(u.id)}
                        className="admin-users-btn admin-users-btn-unban"
                      >
                        해제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}