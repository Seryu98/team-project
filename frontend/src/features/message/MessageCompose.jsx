// src/features/message/MessageCompose.jsx
import React, { useState } from "react";
import axios from "axios";

export default function MessageCompose({ onSent }) {
  /* ================================
     ✅ 상태 정의
  ================================ */
  const [receiverNickname, setReceiverNickname] = useState(""); // ✅ 닉네임 기반
  const [suggestions, setSuggestions] = useState([]); // 자동완성 목록
  const [content, setContent] = useState(""); // 쪽지 내용
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /* ================================
     ✅ 닉네임 검색 기능
  ================================ */
  const searchUser = async (nickname) => {
    try {
      if (!nickname.trim()) return setSuggestions([]);
      const token = localStorage.getItem("access_token");
      const res = await axios.get(
        `http://localhost:8000/users/search?nickname=${nickname}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestions(res.data.data || []);
    } catch (err) {
      console.error("❌ 유저 검색 실패:", err);
      setSuggestions([]);
    }
  };

  /* ================================
     ✅ 쪽지 전송 함수
  ================================ */
  async function handleSend() {
    if (!receiverNickname.trim() || !content.trim()) {
      alert("받는 사람과 내용을 모두 입력하세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      // ✅ 수정됨: receiver_nickname 기반 전송으로 변경
      const res = await axios.post(
        "http://localhost:8000/messages",
        { receiver_nickname: receiverNickname.trim(), content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setSuccess(true);
        setReceiverNickname("");
        setContent("");
        setSuggestions([]);
        alert("쪽지를 성공적으로 보냈습니다!");
        onSent?.(); // 보낸함으로 이동
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

  /* ================================
     ✅ 렌더링
  ================================ */
  return (
    <div className="msg-compose">
      <h3 className="msg-detail__title">쪽지 보내기</h3>

      {/* ✅ 전송 성공 메시지 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm mb-3 p-2 rounded">
          ✅ 쪽지가 성공적으로 전송되었습니다.
        </div>
      )}

      {/* ✅ 에러 메시지 */}
      {error && (
        <div className="text-red-500 text-sm mb-3 bg-red-50 border border-red-200 rounded p-2">
          ⚠️ {error}
        </div>
      )}

      {/* ✅ 닉네임 입력 */}
      <label className="block text-sm font-semibold mb-2">받는 사람 닉네임</label>
      <input
        type="text"
        value={receiverNickname}
        onChange={(e) => {
          setReceiverNickname(e.target.value);
          searchUser(e.target.value);
        }}
        className="w-full border rounded p-2 mb-2"
        placeholder="예: 홍길동"
        disabled={loading}
      />

      {/* ✅ 자동완성 목록 */}
      {suggestions.length > 0 && (
        <ul className="border rounded mb-3 bg-white max-h-40 overflow-y-auto">
          {suggestions.map((user) => (
            <li
              key={user.id}
              className="p-2 cursor-pointer hover:bg-blue-50"
              onClick={() => {
                setReceiverNickname(user.nickname);
                setSuggestions([]);
              }}
            >
              {user.nickname}{" "}
              <span className="text-gray-400">({user.user_id})</span>
            </li>
          ))}
        </ul>
      )}

      {/* ✅ 쪽지 내용 입력 */}
      <label className="block text-sm font-semibold mb-2">내용</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border rounded p-2 h-40 resize-none"
        placeholder="쪽지 내용을 입력하세요."
        disabled={loading}
      />

      {/* ✅ 전송 버튼 */}
      <button
        onClick={handleSend}
        disabled={loading}
        className={`msg-btn msg-btn--green w-full ${loading ? "opacity-70" : ""}`}
      >
        {loading ? "📨 전송 중..." : "📨 쪽지 보내기"}
      </button>
    </div>
  );
}
