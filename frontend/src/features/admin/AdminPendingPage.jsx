// src/features/admin/AdminPendingPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPendingPage() {
  const [pendingPosts, setPendingPosts] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("http://localhost:8000/admin/pending-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingPosts(res.data.data || []);
    } catch (err) {
      console.error("❌ 승인 대기 불러오기 실패:", err);
    }
  }

  async function approvePost(id) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/posts/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 승인 완료");
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("승인 중 오류가 발생했습니다.");
    }
  }

  async function rejectPost(id) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/posts/${id}/reject`,
        { reason: "관리자 판단에 따라 거절되었습니다." },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("🚫 거절 완료");
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("거절 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">승인 대기 게시글</h1>
      {pendingPosts.length === 0 ? (
        <p>승인 대기 게시글이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {pendingPosts.map((p) => (
            <li key={p.id} className="border p-3 rounded-lg flex justify-between">
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-gray-600">{p.created_at}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approvePost(p.id)} className="bg-green-500 text-white px-3 py-1 rounded">승인</button>
                <button onClick={() => rejectPost(p.id)} className="bg-red-500 text-white px-3 py-1 rounded">거절</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}