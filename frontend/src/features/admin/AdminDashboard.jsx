// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [pendingPosts, setPendingPosts] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);

  // 초기 승인/신고 목록 로드
  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchPending() {
    try {
      const token = localStorage.getItem("access_token");
      const postsRes = await axios.get("http://localhost:8000/admin/pending-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingPosts(postsRes.data.data || []);

      const reportsRes = await axios.get("http://localhost:8000/admin/pending-reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingReports(reportsRes.data.data || []);
    } catch (err) {
      console.error("❌ 관리자 대기목록 불러오기 실패:", err);
    }
  }

  // ✅ 승인 처리
  async function approvePost(id) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/posts/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ 게시글을 승인했습니다.");
      // UI 즉시 반영 (새로고침 없이 목록에서 제거)
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("❌ 승인 실패:", err.response?.data || err);
      alert("승인 중 오류가 발생했습니다.");
    }
  }

  // ✅ 거절 처리
  async function rejectPost(id) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/posts/${id}/reject`,
        { reason: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("🚫 게시글을 거절했습니다.");
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("❌ 거절 실패:", err.response?.data || err);
      alert("거절 중 오류가 발생했습니다.");
    }
  }

  // ✅ 신고 처리
  async function resolveReport(id, action) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/reports/${id}/resolve`,
        null,
        {
          params: { action },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(action === "RESOLVE" ? "✅ 신고 처리 완료" : "🚫 신고 반려 완료");
      setPendingReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("❌ 신고 처리 실패:", err.response?.data || err);
      alert("신고 처리 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">관리자 대시보드</h1>

      {/* 승인 대기 게시글 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">승인 대기 게시글</h2>
        {pendingPosts.length === 0 ? (
          <p>승인 대기 게시글이 없습니다.</p>
        ) : (
          <ul className="list-disc pl-6 space-y-2">
            {pendingPosts.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span>{p.title}</span>
                <button
                  onClick={() => approvePost(p.id)}
                  className="px-2 py-1 border rounded hover:bg-green-100"
                >
                  승인
                </button>
                <button
                  onClick={() => rejectPost(p.id)}
                  className="px-2 py-1 border rounded hover:bg-red-100"
                >
                  거절
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 신고 목록 */}
      <section>
        <h2 className="text-lg font-semibold mb-2">신고 목록</h2>
        {pendingReports.length === 0 ? (
          <p>처리할 신고가 없습니다.</p>
        ) : (
          <ul className="list-disc pl-6 space-y-2">
            {pendingReports.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span>#{r.id}</span>
                <button
                  onClick={() => resolveReport(r.id, "RESOLVE")}
                  className="px-2 py-1 border rounded hover:bg-blue-100"
                >
                  처리
                </button>
                <button
                  onClick={() => resolveReport(r.id, "REJECT")}
                  className="px-2 py-1 border rounded hover:bg-gray-100"
                >
                  반려
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
  