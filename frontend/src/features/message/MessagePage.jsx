import { useEffect, useState } from "react";
import axios from "axios";
import "./MessagePage.css";  // ✅ 커스텀 CSS 임포트

export default function MessagesPage({ currentUser }) {
  const [activeTab, setActiveTab] = useState("inbox");
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const token = localStorage.getItem("token");

  const displayName = (msg) =>
    activeTab === "inbox"
      ? (msg.sender_nickname ?? msg.sender_name ?? msg.sender?.nickname ?? `#${msg.sender_id}`)
      : (msg.receiver_nickname ?? msg.receiver_name ?? msg.receiver?.nickname ?? `#${msg.receiver_id}`);

  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      const url =
        activeTab === "inbox"
          ? `${base}/messages/inbox`
          : `${base}/messages/sent`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setMessages(data);
    } catch (err) {
      console.error("쪽지 불러오기 실패", err);
      setMessages([]);
    }
  };

  const fetchMessageDetail = async (id) => {
    try {
      const res = await axios.get(`${base}/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedMessage(res.data);

      await axios.patch(
        `${base}/messages/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("쪽지 상세 불러오기 실패", err);
    }
  };

  const handleReportSubmit = async () => {
    try {
      if (!selectedMessage) return;
      await axios.post(
        `${base}/reports`,
        {
          reported_id: selectedMessage.sender_id,
          reason: reportReason,
          message_id: selectedMessage.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("신고가 접수되었습니다.");
      setShowReportForm(false);
      setReportReason("");
    } catch (err) {
      console.error("신고 실패", err);
      alert("신고에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (activeTab === "inbox" || activeTab === "sent") {
      fetchMessages();
      setSelectedMessage(null);
    }
  }, [activeTab]);

  if (!currentUser) {
    return <div className="msg-guest">로그인 후 이용해주세요.</div>;
  }

  return (
    <div className="msg-layout">
      {/* 좌측 사이드바 */}
      <aside className="msg-sidebar">
        <h2 className="msg-title">쪽지함</h2>
        <ul className="msg-menu">
          <li className="msg-admin">관리자 (공지사항)</li>
          <li
            className={`msg-menu-item ${activeTab === "compose" ? "active" : ""}`}
            onClick={() => setActiveTab("compose")}
          >
            메시지 보내기
          </li>
          <li
            className={`msg-menu-item ${activeTab === "inbox" ? "active" : ""}`}
            onClick={() => setActiveTab("inbox")}
          >
            받은 메시지
          </li>
          <li
            className={`msg-menu-item ${activeTab === "sent" ? "active" : ""}`}
            onClick={() => setActiveTab("sent")}
          >
            보낸 메시지
          </li>
        </ul>
      </aside>

      {/* 중앙 메시지 목록 */}
      <section className="msg-list">
        <h3 className="msg-subtitle">메시지 목록</h3>
        {messages.length === 0 ? (
          <div className="msg-empty">쪽지가 없습니다.</div>
        ) : (
          <ul className="msg-list-items">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`msg-item ${selectedMessage?.id === msg.id ? "selected" : ""}`}
                onClick={() => fetchMessageDetail(msg.id)}
              >
                <p className="msg-name">{displayName(msg)}</p>
                <p className="msg-preview">{msg.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 우측 상세보기 */}
      <section className="msg-detail">
        {selectedMessage ? (
          <div className="msg-detail-card">
            <div className="msg-detail-header">
              <div>
                <p className="msg-detail-name">보낸 사람: {displayName(selectedMessage)}</p>
                <p className="msg-detail-time">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
              <button
                className="btn-report"
                onClick={() => setShowReportForm(true)}
              >
                신고
              </button>
            </div>
            <textarea
              value={selectedMessage.content}
              readOnly
              className="msg-detail-content"
            />
          </div>
        ) : (
          <div className="msg-empty">쪽지를 선택하세요</div>
        )}
      </section>

      {/* 신고 모달 */}
      {showReportForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">신고하기</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="modal-textarea"
              placeholder="신고 사유를 입력하세요"
            />
            <div className="modal-actions">
              <button
                onClick={() => setShowReportForm(false)}
                className="btn-cancel"
              >
                취소
              </button>
              <button
                onClick={handleReportSubmit}
                className="btn-submit"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
