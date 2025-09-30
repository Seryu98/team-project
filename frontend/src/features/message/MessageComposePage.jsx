import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MessageComposePage({ currentUser }) {
  const navigate = useNavigate();
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiverId || !content) {
      alert("수신자와 내용을 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      await axios.post(`${base}/messages/`, {
        sender_id: currentUser.id,   // ✅ 백엔드에서 토큰 기반으로 처리한다면 제거 가능
        receiver_id: Number(receiverId),
        content,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("쪽지를 보냈습니다.");
      navigate("/messages/sent");
    } catch (err) {
      console.error("쪽지 전송 실패", err);
      alert("쪽지 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">쪽지 보내기</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">받는 사람 ID</label>
          <input
            type="number"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="수신자 ID 입력"
          />
        </div>
        <div>
          <label className="block mb-1">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={5}
            placeholder="쪽지 내용을 입력하세요"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loading ? "보내는 중..." : "보내기"}
        </button>
      </form>
    </div>
  );
}
