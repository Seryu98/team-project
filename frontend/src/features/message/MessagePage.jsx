// src/features/message/MessagesPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import axios from "axios";
import MessageDetail from "./MessageDetail";
import MessageList from "./MessageList";
import MessageCompose from "./MessageCompose";
import "./messages.css";

export default function MessagesPage() {
  // ✅ 상태 정의
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const receiverFromQuery = params.get("receiver") || "";
  const { id: messageId } = useParams(); // ✅ [10/18] URL 파라미터
  const [selectedTab, setSelectedTab] = useState(
    receiverFromQuery ? "compose" : "inbox" // ✅ receiver 있으면 compose로 시작
  );
  const [messages, setMessages] = useState([]); // 목록 데이터
  const [selectedMessage, setSelectedMessage] = useState(null); // 상세보기 데이터
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  // ✅ [핵심 수정] 알림 클릭 시 탭 전환 + 목록 선로딩 안정화 (공지/관리자 공통)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tab = params.get("tab");

    if (idFromQuery && ["admin", "notice"].includes(tab)) {
      console.log("🩵 알림 클릭 진입:", tab);
      setSelectedTab(tab);

      // ✅ 목록 선로딩 (지연 보정)
      setTimeout(() => {
        fetchMessages(tab);
      }, 150);
    }

    // ✅ 일반 쪽지 알림 (tab 없이 id만 있을 때)
    else if (idFromQuery && !tab) {
      setSelectedTab("inbox");

      setTimeout(() => {
        fetchMessages("inbox");
      }, 150);

      // ✅ URL 정리 (id만 있을 때는 inbox 경로로 덮어쓰기)
      window.history.replaceState({}, "", `/messages/${idFromQuery}`);
    }
  }, [location.search]);

  // ✅ [10/18] URL이 /messages/:id 형태일 경우 → 받은쪽지함 자동 열기 + 상세보기 표시
  useEffect(() => {
    if (messageId && selectedTab !== "notice") {
      setSelectedTab("inbox");
    }
  }, [messageId]);

  // ✅ [공지 상세 자동표시 - 최종확정 10/25]
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tab = params.get("tab");

    // tab=notice + id 존재 시에만 동작
    if (tab === "notice" && idFromQuery) {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // ✅ messages가 로드된 상태라면 즉시 처리
      if (messages.length > 0) {
        const found = messages.find(
          (m) =>
            String(m.id) === String(idFromQuery) ||
            String(m.message_id) === String(idFromQuery)
        );

        if (found) {
          console.log("✅ 공지 상세 자동 표시 성공:", found);
          setSelectedMessage(found);
          return; // 이미 성공 시 중복 실행 방지
        }
      }

      // ✅ messages가 아직 비었으면 0.3초 후 재시도 (지연 재시도)
      const timer = setTimeout(() => {
        console.log("⏳ 공지 상세 자동 재시도...");
        const token2 = localStorage.getItem("access_token");
        if (!token2) return;

        axios
          .get(`http://localhost:8000/messages/${idFromQuery}`, {
            headers: { Authorization: `Bearer ${token2}` },
          })
          .then((res) => {
            const msg = res.data?.data || res.data;
            console.log("📩 공지 단건 조회 결과:", msg);
            if (msg) setSelectedMessage(msg);
          })
          .catch((err) => {
            console.error("❌ 공지 상세 자동 불러오기 실패:", err);
          });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [location.search, messages]);

  // ✅ [관리자 쪽지 자동 표시 - 10/25 최종]
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tab = params.get("tab");

    if (tab === "admin" && idFromQuery) {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // messages가 이미 로드된 경우 즉시 처리
      if (messages.length > 0) {
        const found = messages.find(
          (m) =>
            String(m.id) === String(idFromQuery) ||
            String(m.message_id) === String(idFromQuery)
        );
        if (found) {
          console.log("✅ 관리자 쪽지 자동 표시 성공:", found);
          setSelectedMessage(found);
          return;
        }
      }

      // messages가 아직 비었으면 0.3초 후 재시도
      const timer = setTimeout(() => {
        console.log("⏳ 관리자 쪽지 자동 재시도...");
        axios
          .get(`http://localhost:8000/messages/${idFromQuery}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const msg = res.data?.data || res.data;
            if (msg) {
              setSelectedMessage(msg);
              console.log("✅ 관리자 쪽지 단건 로드 완료:", msg);
            }
          })
          .catch((err) => {
            console.error("❌ 관리자 쪽지 자동 불러오기 실패:", err);
          });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [location.search, messages]);

  // ---------------------------------------------------------------------
  // ✅ 메시지 목록 불러오기 (탭별 URL 분기)
  // ---------------------------------------------------------------------
  async function fetchMessages(tab = selectedTab) {
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
      if (tab === "inbox") url = "http://localhost:8000/messages";
      else if (tab === "sent") url = "http://localhost:8000/messages/sent";
      else if (tab === "notice")
        url = "http://localhost:8000/messages?category=NOTICE";
      else if (tab === "admin")
        url = "http://localhost:8000/messages?category=ADMIN";
      else return;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ 공지사항 탭일 때는 selectedMessage 유지
      if (!messageId && tab !== "notice") {
        setSelectedMessage(null);
      }

      const items = res.data?.data || res.data?.items || [];
      setMessages(items);
    } catch (err) {
      console.error("❌ 메시지 목록 불러오기 실패:", err);
      setError("메시지를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ [핵심 수정] selectedTab 변경 시 목록 로드 (중복 방지 + 초기화 제어)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tabFromQuery = params.get("tab");

    // 🩵 알림에서 진입한 경우 (tab=admin/notice + id 있음)
    const isFromNotification =
      idFromQuery && ["admin", "notice"].includes(tabFromQuery);

    // 🩵 이미 fetchMessages(tab) 실행됨 → 재호출 방지
    if (isFromNotification) return;

    // compose 모드일 때는 목록 초기화만 수행
    if (selectedTab === "compose") {
      setMessages([]); // ✅ compose는 목록 비움
      return;
    }

    // ⚙️ 일반 탭 전환 시에만 실행 (렌더 안정화를 위해 0.2초 지연)
    const timer = setTimeout(() => {
      fetchMessages(selectedTab);
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedTab]);

  // ---------------------------------------------------------------------
  // ✅ 렌더링
  // ---------------------------------------------------------------------
  return (
    <div className="msg-layout">
      {/* ✅ 왼쪽 메뉴 */}
      <aside className="msg-sidebar">
        <h2 className="msg-sidebar__title">쪽지함</h2>

        {/* ✅ 공지사항 탭 */}
        <button
          className={`msg-sidebar__btn ${
            selectedTab === "notice" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("notice")}
        >
          📢 공지사항
        </button>

        {/* ✅ 관리자 탭 */}
        <button
          className={`msg-sidebar__btn ${
            selectedTab === "admin" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("admin")}
        >
          👮 관리자
        </button>

        {/* ✅ 쪽지 작성 */}
        <button
          className={`msg-sidebar__btn ${
            selectedTab === "compose" ? "msg-sidebar__btn--active" : ""
          }`}
          onClick={() => setSelectedTab("compose")}
        >
          ✉️ 쪽지 보내기
        </button>

        {/* ✅ 받은/보낸 쪽지 */}
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
              ? "공지사항 목록"
              : selectedTab === "admin"
              ? "관리자 쪽지 목록"
              : selectedTab === "inbox"
              ? "받은 쪽지 목록"
              : selectedTab === "sent"
              ? "보낸 쪽지 목록"
              : "쪽지 작성"}
          </span>
        </div>

        {loading ? (
          <p className="p-4">불러오는 중...</p>
        ) : error ? (
          <p className="p-4 text-red-600">{error}</p>
        ) : selectedTab === "compose" ? (
          <MessageCompose
            onSent={() => setSelectedTab("sent")}
            defaultReceiver={receiverFromQuery} // ✅ 쿼리에서 받은 닉네임 전달
          />
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

      {/* ✅ 오른쪽 상세보기 */}
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
