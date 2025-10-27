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

  // ✅ [추가] URL 기반 탭 자동 동기화 (공지사항 / 관리자 / 받은쪽지 등)
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const tabFromQuery = (search.get("tab") || "").toLowerCase();

    // /messages/notice 같은 path에서도 동작
    const pathParts = location.pathname.split("/").filter(Boolean); // ["messages","notice"]
    const pathTab = (pathParts[1] || "").toLowerCase();

    const validTabs = ["notice", "admin", "inbox", "sent", "compose", "trash"];
    const candidate =
      validTabs.includes(tabFromQuery)
        ? tabFromQuery
        : validTabs.includes(pathTab)
          ? pathTab
          : null;

    if (!candidate) return;

    if (selectedTab !== candidate) {
      setSelectedTab(candidate);
      // 목록 미리 불러오기 (공지사항 알림 클릭 시도 포함)
      setTimeout(() => fetchMessages(candidate), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // ✅ [핵심 수정] 알림 클릭 시 탭 전환 + 목록 선로딩 안정화 (공지/관리자 공통)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tab = params.get("tab");

    if (idFromQuery && ["admin", "notice"].includes(tab)) {
      console.log("🩵 알림 클릭 진입:", tab);
      setSelectedTab(tab);
      setTimeout(() => fetchMessages(tab), 150);
    } else if (idFromQuery && !tab) {
      setSelectedTab("inbox");
      setTimeout(() => fetchMessages("inbox"), 150);
      window.history.replaceState({}, "", `/messages/${idFromQuery}`);
    }
  }, [location.search]);

  // ✅ [10/18] URL이 /messages/:id 형태일 경우 → 받은쪽지함 자동 열기 + 상세보기 표시
  useEffect(() => {
    if (messageId && selectedTab !== "notice") {
      setSelectedTab("inbox");
    }
  }, [messageId]);

  // ✅ [공지 상세 자동 표시 - 최종 안정 버전 10/27]
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tab = params.get("tab");

    // 🔹 공지 탭 + id 있을 때만
    if (tab !== "notice" || !idFromQuery) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    // 🔹 목록이 아직 로드 안됐으면 목록 먼저 가져오기
    if (!messages || messages.length === 0) {
      console.log("⏳ 공지 목록 비어있음 → 목록 먼저 로드 후 상세 표시 대기");
      fetchMessages("notice").then(() => {
        // 목록 로드 후 약간의 지연을 두고 다시 매칭 시도
        setTimeout(() => {
          const found = messages.find(
            (m) =>
              String(m.id) === String(idFromQuery) ||
              String(m.message_id) === String(idFromQuery)
          );
          if (found) {
            console.log("✅ (지연 매칭) 공지 상세 표시 성공:", found);
            setSelectedMessage(found);
          }
        }, 300);
      });
      return;
    }

    // 🔹 이미 목록이 있을 때는 바로 매칭
    const found = messages.find(
      (m) =>
        String(m.id) === String(idFromQuery) ||
        String(m.message_id) === String(idFromQuery)
    );

    if (found) {
      console.log("✅ 공지 상세 자동 표시 성공:", found);
      setSelectedMessage(found);
    } else {
      // 🔹 목록에도 없으면 단건 조회
      console.log("📡 목록에 없음 → 단건 조회 요청");
      axios
        .get(`http://localhost:8000/messages/${idFromQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const msg = res.data?.data || res.data;
          if (msg) {
            console.log("📩 공지 단건 조회 결과:", msg);
            setSelectedMessage(msg);
          }
        })
        .catch((err) => {
          console.error("❌ 공지 단건 불러오기 실패:", err);
        });
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
      else if (tab === "trash")
        url = "http://localhost:8000/messages/trash";
      else return;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ 응답 구조가 배열 또는 객체일 수 있음 → 안전 처리
      const items =
        Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data?.items || [];

      if (!messageId && tab !== "notice") {
        setSelectedMessage(null);
      }
      setMessages(items);
    } catch (err) {
      console.error("❌ 메시지 목록 불러오기 실패:", err);
      setError("메시지를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ [핵심 수정] selectedTab 변경 시 목록 로드
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idFromQuery = params.get("id");
    const tabFromQuery = params.get("tab");
    const isFromNotification =
      idFromQuery && ["admin", "notice"].includes(tabFromQuery);
    if (isFromNotification) return;
    if (selectedTab === "compose") {
      setMessages([]);
      return;
    }
    const timer = setTimeout(() => fetchMessages(selectedTab), 200);
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
          className={`msg-sidebar__btn ${selectedTab === "notice" ? "msg-sidebar__btn--active" : ""
            }`}
          onClick={() => setSelectedTab("notice")}
        >
          📢 공지사항
        </button>

        {/* ✅ 관리자 탭 */}
        <button
          className={`msg-sidebar__btn ${selectedTab === "admin" ? "msg-sidebar__btn--active" : ""
            }`}
          onClick={() => setSelectedTab("admin")}
        >
          👮 관리자
        </button>

        {/* ✅ 쪽지 작성 */}
        <button
          className={`msg-sidebar__btn ${selectedTab === "compose" ? "msg-sidebar__btn--active" : ""
            }`}
          onClick={() => setSelectedTab("compose")}
        >
          ✉️ 쪽지 보내기
        </button>

        {/* ✅ 받은/보낸 쪽지 */}
        <button
          className={`msg-sidebar__btn ${selectedTab === "inbox" ? "msg-sidebar__btn--active" : ""
            }`}
          onClick={() => setSelectedTab("inbox")}
        >
          📥 받은 쪽지
        </button>
        <button
          className={`msg-sidebar__btn ${selectedTab === "sent" ? "msg-sidebar__btn--active" : ""
            }`}
          onClick={() => setSelectedTab("sent")}
        >
          📤 보낸 쪽지
        </button>

        {/* 🗑️ 휴지통 탭 추가 */}
        <button
          className={`msg-sidebar__btn ${selectedTab === "trash" ? "msg-sidebar__btn--active" : ""
            }`}
          onClick={() => setSelectedTab("trash")}
        >
          🗑️ 휴지통
        </button>
      </aside>

      {/* =========================
          ✅ 중앙 목록
      ========================= */}
      <section className="msg-list">
        <div className="msg-list__header flex items-center justify-between">
          <span>
            {selectedTab === "notice"
              ? "공지사항 목록"
              : selectedTab === "admin"
                ? "관리자 쪽지 목록"
                : selectedTab === "inbox"
                  ? "받은 쪽지 목록"
                  : selectedTab === "sent"
                    ? "보낸 쪽지 목록"
                    : selectedTab === "trash"
                      ? "휴지통"
                      : "쪽지 작성"}
          </span>

          {/* 🧹 휴지통 비우기 버튼 */}
          {selectedTab === "trash" && (
            <button
              onClick={async () => {
                if (!confirm("휴지통을 완전히 비우시겠습니까?")) return;
                const token = localStorage.getItem("access_token");
                await axios.delete(
                  "http://localhost:8000/messages/trash/empty",
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                alert("휴지통이 비워졌습니다.");
                fetchMessages("trash");
              }}
              className="text-sm bg-red-500 text-white rounded px-2 py-1"
            >
              휴지통 비우기
            </button>
          )}
        </div>

        {loading ? (
          <p className="p-4">불러오는 중...</p>
        ) : error ? (
          <p className="p-4 text-red-600">{error}</p>
        ) : selectedTab === "compose" ? (
          <MessageCompose
            onSent={() => setSelectedTab("sent")}
            defaultReceiver={receiverFromQuery}
          />
        ) : messages.length === 0 ? (
          <p className="p-4 text-gray-500">쪽지가 없습니다.</p>
        ) : (
          <MessageList
            messages={messages}
            selectedTab={selectedTab}
            onSelect={setSelectedMessage}
            refreshList={() => fetchMessages(selectedTab)} // ✅ 삭제/복원 시 갱신
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
