// src/features/message/MessageCompose.jsx
import React, { useState } from "react";
import axios from "axios";

export default function MessageCompose({ onSent, defaultReceiver = "" }) {
  /* ================================
     ✅ 상태 정의
  ================================ */
  const [receiverNickname, setReceiverNickname] = useState(defaultReceiver); // ✅ 쿼리에서 받은 닉네임으로 초기값
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
        setTimeout(() => {
          onSent?.(); // 보낸함으로 이동
        }, 1500);
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
      {/* ✅ 헤더 */}
      <div className="msg-compose__header">
        <h3 className="msg-compose__title">✉️ 새 쪽지 작성</h3>
        <p className="msg-compose__subtitle">소중한 메시지를 전달해보세요</p>
      </div>

      {/* ✅ 전송 성공 메시지 */}
      {success && (
        <div className="msg-compose__alert msg-compose__alert--success">
          <span className="msg-compose__alert-icon">✓</span>
          <span>쪽지가 성공적으로 전송되었습니다!</span>
        </div>
      )}

      {/* ✅ 에러 메시지 */}
      {error && (
        <div className="msg-compose__alert msg-compose__alert--error">
          <span className="msg-compose__alert-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ✅ 받는 사람 입력 */}
      <div className="msg-compose__field msg-compose__field--receiver">
        <label className="msg-compose__label">
          <span className="msg-compose__label-icon">👤</span>
          받는 사람
        </label>
        <div className="msg-compose__input-wrapper">
          <input
            type="text"
            value={receiverNickname}
            onChange={(e) => {
              setReceiverNickname(e.target.value);
              searchUser(e.target.value);
            }}
            className="msg-compose__input"
            placeholder="닉네임을 입력하세요"
            disabled={loading}
          />
      </div>

      {/* ✅ 자동완성 목록 */}
      {suggestions.length > 0 && (
        <ul className="msg-compose__suggestions">
          {suggestions.map((user) => (
            <li
              key={user.id}
              className="msg-compose__suggestion-item"
              onClick={() => {
                setReceiverNickname(user.nickname);
                setSuggestions([]);
              }}
            >
              <span className="msg-compose__suggestion-name">
                {user.nickname}
              </span>
              <span className="msg-compose__suggestion-id">
                @{user.user_id}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>

      {/* ✅ 쪽지 내용 입력 */ }
  <div className="msg-compose__field">
    <label className="msg-compose__label">
      <span className="msg-compose__label-icon">📝</span>
      메시지 내용
    </label>
    <div className="msg-compose__textarea-wrapper">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="msg-compose__textarea"
        placeholder="여기에 메시지를 입력하세요..."
        disabled={loading}
        maxLength={1000}
      />
      <div className="msg-compose__char-count">
        {content.length} / 1000자
      </div>
    </div>
  </div>

  {/* ✅ 전송 버튼 */ }
  <button
    onClick={handleSend}
    disabled={loading || !receiverNickname.trim() || !content.trim()}
    className="msg-compose__submit"
  >
    {loading ? (
      <>
        <span className="msg-compose__submit-spinner"></span>
        전송 중...
      </>
    ) : (
      <>
        <span className="msg-compose__submit-icon">📨</span>
        쪽지 보내기
      </>
    )}
  </button>
    </div >
  );
}