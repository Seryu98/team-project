import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MessageComposePage({ currentUser }) {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");   // 닉네임 입력값
  const [receiverId, setReceiverId] = useState(null); // API로 찾은 user_id
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const token = localStorage.getItem("token");

  // ✅ 닉네임으로 사용자 검색
  const handleSearch = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력하세요.");
      return;
    }
    try {
      const res = await axios.get(`${base}/users/by-nickname?nickname=${nickname}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReceiverId(res.data.id);
      alert(`수신자 확인됨: ${res.data.nickname} (ID: ${res.data.id})`);
    } catch (err) {
      console.error("유저 검색 실패", err);
      alert("해당 닉네임의 사용자를 찾을 수 없습니다.");
    }
  };

  // ✅ 쪽지 전송
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiverId) {
      alert("닉네임 검색으로 수신자를 먼저 확인하세요.");
      return;
    }
    if (!content.trim()) {
      alert("쪽지 내용을 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${base}/messages/`,
        {
          receiver_nickname: nickname,
          content,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("쪽지를 보냈습니다.");
      navigate("/messages"); // 보낸 후 목록으로 이동
    } catch (err) {
      console.error("쪽지 전송 실패", err);
      alert("쪽지 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        <p>로그인 후 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">쪽지 보내기</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 닉네임 검색 */}
        <div>
          <label className="block mb-1 font-semibold">받는 사람 닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
              placeholder="닉네임 입력"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              검색
            </button>
          </div>

          {receiverId && (
            <p className="text-sm text-green-600 mt-1">
              선택된 수신자 ID: {receiverId}
            </p>
          )}
        </div>

        {/* 메시지 입력 */}
        <div>
          <label className="block mb-1 font-semibold">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={5}
            placeholder="쪽지 내용을 입력하세요"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/messages")}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {loading ? "보내는 중..." : "보내기"}
          </button>
        </div>
      </form>
    </div>
  );
}
