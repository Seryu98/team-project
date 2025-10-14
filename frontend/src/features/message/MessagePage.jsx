// src/features/message/MessagesPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import MessageSidebar from "./MessageSidebar";
import MessageList from "./MessageList";
import MessageDetail from "./MessageDetail";
import MessageCompose from "./MessageCompose";
import "./messages.css";

export default function MessagesPage() {
  // ✅ 상태 정의
  const [selectedTab, setSelectedTab] = useState("inbox"); // notice | compose | inbox | sent
  const [messages, setMessages] = useState([]); // 목록 데이터
  const [selectedMessage, setSelectedMessage] = useState(null); // 상세보기 데이터
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  // ✅ 메시지 목록 불러오기
  async function fetchMessages() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      let url = "";
      if (selectedTab === "inbox") url = "http://localhost:8000/messages";
      else if (selectedTab === "sent") url = "http://localhost:8000/messages/sent";
      else if (selectedTab === "notice") url = "http://localhost:8000/announcements";

      if (!url) return; // compose 탭일 경우 요청 생략

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data?.data || []);
      setSelectedMessage(null); // 탭 변경 시 상세 초기화
    } catch (err) {
      console.error("❌ 메시지 목록 불러오기 실패:", err);
      setError("메시지를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 탭 변경 시 데이터 다시 불러오기
  useEffect(() => {
    if (selectedTab !== "compose") fetchMessages();
  }, [selectedTab]);

  // ✅ 렌더링 시작
  return (
    <div className="msg-layout">
      {/* =========================
          ✅ 왼쪽 사이드바
      ========================= */}
      <aside className="msg-sidebar">
        <h2 className="msg-sidebar__title">쪽지함</h2>

        <button
          className={`msg-sidebar__btn ${
            selectedTab === "notice" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("notice")}
        >
          📢 관리자 (공지사항)
        </button>

        <button
          className={`msg-sidebar__btn ${
            selectedTab === "compose" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("compose")}
        >
          ✉️ 쪽지 보내기
        </button>

        <button
          className={`msg-sidebar__btn ${
            selectedTab === "inbox" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("inbox")}
        >
          📥 받은 쪽지
        </button>

        <button
          className={`msg-sidebar__btn ${
            selectedTab === "sent" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("sent")}
        >
          📤 보낸 쪽지
        </button>
      </aside>

      {/* =========================
          ✅ 중앙 목록
      ========================= */}
      <section className="msg-list">
        <div className="msg-list__header">
          <span>
            {selectedTab === "notice"
              ? "관리자 공지 목록"
              : selectedTab === "inbox"
              ? "받은 쪽지 목록"
              : selectedTab === "sent"
              ? "보낸 쪽지 목록"
              : "쪽지 작성"}
          </span>
        </div>

        {/* ✅ 목록 내용 */}
        {loading ? (
          <p className="p-4">불러오는 중...</p>
        ) : error ? (
          <p className="p-4 text-red-600">{error}</p>
        ) : selectedTab === "compose" ? (
          <MessageCompose onSent={() => setSelectedTab("sent")} />
        ) : messages.length === 0 ? (
          <p className="p-4 text-gray-500">쪽지가 없습니다.</p>
        ) : (
          <MessageList
            messages={messages}
            selectedTab={selectedTab}
            onSelect={setSelectedMessage}
          />
        )}
      </section>

      {/* =========================
          ✅ 오른쪽 상세 보기
      ========================= */}
      <section className="msg-detail">
        <div className="msg-detail__inner">
          {selectedMessage ? (
            <MessageDetail message={selectedMessage} />
          ) : (
            <p className="text-gray-500">쪽지를 선택하세요.</p>
          )}
        </div>
      </section>
    </div>
  );
}
