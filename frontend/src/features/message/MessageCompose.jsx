// src/features/message/MessageCompose.jsx
import React, { useState } from "react";
import axios from "axios";

export default function MessageCompose({ onSent }) {
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");

  async function handleSend() {
    const token = localStorage.getItem("access_token");
    try {
      await axios.post(
        "http://localhost:8000/messages",
        { receiver_id: receiverId, content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("쪽지를 보냈습니다.");
      onSent();
    } catch (err) {
      console.error("❌ 쪽지 전송 실패:", err);
      alert("전송 실패");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">쪽지 작성</h2>
      <input
        type="number"
        placeholder="받는 사람 ID"
        value={receiverId}
        onChange={(e) => setReceiverId(e.target.value)}
        className="w-full border rounded p-2 mb-3"
      />
      <textarea
        placeholder="쪽지 내용을 입력하세요."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border rounded p-2 h-40"
      />
      <button
        onClick={handleSend}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        전송
      </button>
    </div>
  );
}
