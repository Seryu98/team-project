// src/features/message/MessageDetail.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MessageDetail({ message }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ 로그인 사용자 정보 불러오기
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await axios.get("http://localhost:8000/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCurrentUser();
  }, []);

  // ✅ 읽음 처리 (수신자일 때만)
  useEffect(() => {
    async function markAsRead() {
      if (!message || !message.id) return;
      const token = localStorage.getItem("access_token");
      try {
        await axios.post(
          `http://localhost:8000/messages/${message.id}/read`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        localStorage.setItem("refreshNotifications", "true");
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.error("❌ 읽음 처리 실패:", err);
      }
    }

    if (message?.receiver_id === currentUser?.id) markAsRead();
  }, [message, currentUser]);

  // ✅ 지원서 관련 ID 추출 (기존 로직 유지)
  const applicationId = message?.content?.match(/application_id=(\d+)/)?.[1];
  const postId = message?.content?.match(/post_id=(\d+)/)?.[1];

  async function decideApplication(accepted) {
    if (!applicationId || !postId)
      return alert("지원서 ID 또는 게시글 ID를 찾을 수 없습니다.");

    const token = localStorage.getItem("access_token");
    try {
      const endpoint = accepted
        ? `http://localhost:8000/recipe/${postId}/applications/${applicationId}/approve`
        : `http://localhost:8000/recipe/${postId}/applications/${applicationId}/reject`;

      await axios.post(endpoint, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(accepted ? "지원서를 승인했습니다." : "지원서를 거절했습니다.");
      window.location.reload();
    } catch (err) {
      console.error("❌ 지원서 결정 실패:", err);
      alert("처리 중 오류가 발생했습니다.");
    }
  }

  if (loading) return <p className="p-4 text-gray-500">불러오는 중...</p>;
  if (!message) return <p className="p-4 text-gray-500">쪽지를 선택하세요.</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold mb-4">쪽지 상세</h1>

      <div className="border rounded p-3 bg-white shadow-sm">
        <p className="text-sm mb-1">
          <strong>보낸 사람:</strong>{" "}
          {message.sender_nickname || message.sender_id}
        </p>
        <p className="text-sm mb-1">
          <strong>받은 사람:</strong>{" "}
          {message.receiver_nickname || message.receiver_id}
        </p>

        <div className="my-3 whitespace-pre-line text-sm leading-relaxed">
          {message.content}
        </div>

        <p className="text-xs text-right opacity-60">
          {new Date(message.created_at).toLocaleString()}
        </p>
      </div>

      {/* ✅ 리더(수신자)만 승인/거절 버튼 노출 */}
      {applicationId &&
        currentUser?.id === message.receiver_id &&
        message.application_status === "PENDING" && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => decideApplication(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              승인
            </button>
            <button
              onClick={() => decideApplication(false)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              거절
            </button>
          </div>
        )}

      {/* ✅ 신고 버튼 (받은 쪽지일 때만 노출) */}
      {currentUser?.id === message.receiver_id && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => alert("🚨 신고 기능은 다음 단계에서 연결됩니다.")}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            신고
          </button>
        </div>
      )}
    </div>
  );
}
