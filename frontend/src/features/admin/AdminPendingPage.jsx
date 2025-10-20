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

  // [10/19 수정]
  async function approvePost(id) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/posts/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 승인 완료");
      await fetchPending(); // 🔄 목록 새로고침
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
      await fetchPending(); // 🔄 목록 새로고침
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
            <li
              key={p.id}
              className="border p-4 rounded-lg shadow-sm hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{p.title}</h3>

                  {/* ✅ 프로젝트/스터디 구분 + 작성자 */}
                  <p className="text-xs text-gray-500 mt-1">
                    {p.type === "PROJECT" ? "📘 프로젝트" : "📗 스터디"} | 작성자:{" "}
                    {p.leader_nickname || "알 수 없음"}
                  </p>

                  {/* ✅ 내용 일부 미리보기 */}
                  {p.preview && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                      {p.preview}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    작성일: {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => approvePost(p.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => rejectPost(p.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    거절
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}