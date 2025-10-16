import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  async function fetchBannedUsers() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("http://localhost:8000/admin/users/banned", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error("🚫 제재된 유저 목록 불러오기 실패:", err);
    }
  }

  async function handleUnban(userId) {
    if (!window.confirm("정말로 이 유저의 정지를 해제하시겠습니까?")) return;
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/users/${userId}/unban`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 정지 해제 완료");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
      alert("해제 중 오류 발생");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🚫 제재 유저 관리</h1>
      {users.length === 0 ? (
        <p>현재 제재 중인 유저가 없습니다.</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">닉네임</th>
              <th className="border p-2">상태</th>
              <th className="border p-2">정지 해제일</th>
              <th className="border p-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border p-2">{u.id}</td>
                <td className="border p-2">{u.nickname}</td>
                <td className="border p-2 text-red-500 font-semibold">
                  {u.status}
                </td>
                <td className="border p-2">
                  {u.suspend_until
                    ? new Date(u.suspend_until).toLocaleString()
                    : "영구 정지"}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleUnban(u.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    해제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
