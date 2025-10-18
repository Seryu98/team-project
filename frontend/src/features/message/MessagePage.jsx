// src/features/message/MessagesPage.jsx
import { useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import axios from "axios";
import MessageDetail from "./MessageDetail";
import MessageList from "./MessageList";
import MessageCompose from "./MessageCompose";
import "./messages.css";

export default function MessagesPage() {
  // ✅ 상태 정의
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState("inbox"); // notice | admin | compose | inbox | sent   // ✅ 추가됨: admin
  const [messages, setMessages] = useState([]); // 목록 데이터
  const [selectedMessage, setSelectedMessage] = useState(null); // 상세보기 데이터
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  // ✅ URL 쿼리파라미터로 탭 자동 설정
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "admin") {
      setSelectedTab("admin");
    } else if (tab === "notice") {
      setSelectedTab("notice");  // ✅ 추가됨
    }
  }, [location.search]);

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
      else if (selectedTab === "notice") url = "http://localhost:8000/messages?category=NOTICE";
      else if (selectedTab === "admin") {
        // 기본 권장 경로(쿼리 파라미터 방식)
        url = "http://localhost:8000/messages?category=ADMIN"; // ✅ 추가됨
        // ▶ 만약 백엔드가 /messages/admin 으로 구현되었다면 아래로 교체
        // url = "http://localhost:8000/messages/admin";
      }
      else return; // 💬 기존 유지: compose 탭일 때는 요청하지 않음

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 안전한 데이터 접근 및 구조 확인
      const items = res.data?.data || res.data?.items || [];
      setMessages(items);
      setSelectedMessage(null); // 탭 변경 시 상세 초기화
    } catch (err) {
      console.error("❌ 메시지 목록 불러오기 실패:", err);
      setError("메시지를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // selectedTab이 변경될 때마다 실행되지만,
  // "compose"일 때는 요청하지 않고 messages를 초기화만 함
  useEffect(() => {
    if (selectedTab === "compose") {
      // 공지 탭에서 전환 시 이전 요청 중단용 초기화
      setMessages([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (["inbox", "sent", "notice", "admin"].includes(selectedTab)) {
      fetchMessages(selectedTab);
    }
  }, [selectedTab]);
  
  // ✅ 렌더링 시작
  return (
    <div className="msg-layout">
      {/* ✅ 왼쪽 메뉴 */}
      <aside className="msg-sidebar">
        <h2 className="msg-sidebar__title">쪽지함</h2>

        {/* 기존 '관리자 (공지사항)' → '공지사항' 으로 레이블 명확화 */}
        <button
          className={`msg-sidebar__btn ${
            selectedTab === "notice" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("notice")}
        >
          📢 공지사항
        </button>

        {/* ✅ 관리자 탭 (제재/신고 관련 쪽지 전용) */}
        <button
          className={`msg-sidebar__btn ${
            selectedTab === "admin" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("admin")}
        >
          👮 관리자
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
            {
              // ⚙️ 수정됨: admin 탭 헤더 추가
              selectedTab === "notice"
                ? "공지사항 목록"
                : selectedTab === "admin"
                ? "관리자 쪽지 목록"
                : selectedTab === "inbox"
                ? "받은 쪽지 목록"
                : selectedTab === "sent"
                ? "보낸 쪽지 목록"
                : "쪽지 작성"
            }
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

      {/* ✅ 오른쪽 상세보기 (compose 중에는 숨김) */}
      {selectedTab !== "compose" && (
        <section className="msg-detail">
          <div className="msg-detail__inner">
            {selectedMessage ? (
              <MessageDetail message={selectedMessage} />
            ) : (
              <p className="text-gray-500">쪽지를 선택하세요.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
