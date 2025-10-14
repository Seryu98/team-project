// src/features/message/MessageCompose.jsx
import React, { useState } from "react";
import axios from "axios";

export default function MessageCompose({ onSent }) {
  // ✅ 입력 상태 정의
  const [receiverId, setReceiverId] = useState(""); // 받는 사람 ID
  const [content, setContent] = useState(""); // 쪽지 내용
  const [loading, setLoading] = useState(false); // 전송 중 상태
  const [error, setError] = useState(null); // 에러 메시지 저장용

  // ✅ 쪽지 전송 함수
  async function handleSend() {
    if (!receiverId.trim() || !content.trim()) {
      alert("받는 사람 ID와 내용을 모두 입력하세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      // ✅ API 요청
      const res = await axios.post(
        "http://localhost:8000/messages",
        {
          receiver_id: receiverId,
          content: content,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // ✅ 결과 처리
      if (res.data?.success) {
        alert("쪽지를 성공적으로 보냈습니다!");
        setReceiverId("");
        setContent("");
        onSent?.(); // 보낸 후 콜백 (보낸함으로 이동 등)
      } else {
        alert("쪽지 전송에 실패했습니다.");
      }
    } catch (err) {
      console.error("❌ 쪽지 전송 실패:", err);
      if (err.response?.status === 404)
        setError("존재하지 않는 사용자입니다.");
      else if (err.response?.status === 400)
        setError(err.response?.data?.detail || "요청 형식이 잘못되었습니다.");
      else setError("전송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 렌더링
  return (
    <div className="msg-detail__inner">
      <h3 className="msg-detail__title">쪽지 보내기</h3>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-red-500 text-sm mb-3 bg-red-50 border border-red-200 rounded p-2">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2">받는 사람 ID</label>
        <input
          type="number"
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          className="w-full border rounded p-2 mb-3"
          placeholder="예: 12"
        />

        <label className="block text-sm font-semibold mb-2">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border rounded p-2 h-40 resize-none"
          placeholder="쪽지 내용을 입력하세요."
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className="msg-btn msg-btn--green mt-3 w-full"
        >
          {loading ? "전송 중..." : "📨 쪽지 보내기"}
        </button>
      </div>
    </div>
  );
}
