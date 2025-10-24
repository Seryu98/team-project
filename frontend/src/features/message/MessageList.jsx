// src/features/message/MessageList.jsx
import React, { useState } from "react"; //useState 추가
import { FaEnvelope, FaEnvelopeOpen, FaTrash } from "react-icons/fa"; // FaTrash 추가
import axios from "axios"; //  삭제 요청용 axios 추가
import "./messageControls.css"; // 쪽지 목록 제어 버튼 스타일


export default function MessageList({ messages, selectedTab, onSelect }) {
  // 선택된 쪽지 ID 목록
  const [selectedIds, setSelectedIds] = useState([]);

  // 🩵 [추가됨] FastAPI Enum에 맞게 category 변환 함수
  const mapCategory = (tab) => {
    switch (tab) {
      case "admin":
        return "ADMIN";
      case "notice":
        return "NOTICE";
      case "sent":
      case "inbox":
      default:
        return "NORMAL";
    }
  };

  // 전체선택 / 해제
  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) setSelectedIds([]);
    else setSelectedIds(messages.map((m) => m.id));
  };

  //개별 선택 / 해제
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 단일 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("삭제할 쪽지를 선택하세요.");
      return;
    }
    if (!window.confirm(`${selectedIds.length}개의 쪽지를 삭제하시겠습니까?`)) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.request({
        method: "DELETE",
        url: "http://localhost:8000/messages/bulk",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // 🩵 추가해야 FastAPI가 body 인식
        },
        data: {
          message_ids: selectedIds,
          category: mapCategory(selectedTab),
        },
      });
      alert("선택한 쪽지가 삭제되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error("❌ 선택삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  //전체삭제
  const handleDeleteAll = async () => {
    if (!window.confirm("모든 쪽지를 삭제하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("access_token");
      await axios.delete("http://localhost:8000/messages/bulk/all", {
        params: { category: mapCategory(selectedTab) },
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("모든 쪽지가 삭제되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error("❌ 전체삭제 실패:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // ✅ 기존 코드 유지
  if (!messages || messages.length === 0) {
    return <p className="p-4 text-gray-500">쪽지가 없습니다.</p>;
  }

  const getNoticeTitle = (m) => m.title || m.subject || "공지";
  const getNoticeBody = (m) => m.content || m.body || "";

  return (
    <div>
      {/* 상단 컨트롤바 — 전체선택은 왼쪽, 삭제 버튼은 오른쪽 끝으로 */}
      {["notice", "admin", "inbox", "sent"].includes(selectedTab) && (
        <div className="msg-list__controls flex items-center justify-between mb-2 px-2">
          {/* 왼쪽: 전체선택 */}
          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === messages.length}
                onChange={toggleSelectAll}
              />
              전체선택
            </label>
          </div>

          {/* 오른쪽: 삭제 버튼 (오른쪽 상단 정렬) */}
          <button
            onClick={handleDeleteSelected}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
          >
            <FaTrash /> 삭제
          </button>
        </div>
      )}

      {/* ✅ 기존 메시지 목록 */}
      <ul className="msg-list__ul">
        {messages.map((m) => {
          const isRead = !!m.is_read;
          const MailIcon = isRead ? FaEnvelopeOpen : FaEnvelope;
          const isChecked = selectedIds.includes(m.id);

          const itemClass = `relative msg-item p-3 rounded-md ${
            isRead
              ? "bg-gray-50 hover:bg-gray-100 text-gray-700"
              : "bg-blue-50 hover:bg-blue-100 text-black font-semibold"
          } border-b cursor-pointer transition-colors duration-150`;

          return (
            <li
              key={m.id}
              className={itemClass}
              onClick={() => {
                if (!m.is_read) m.is_read = 1;
                onSelect && onSelect(m);
              }}
            >
              {/* ✅ 각 쪽지 왼쪽의 체크박스 유지 */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleSelect(m.id)}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-3 top-3"
              />

              {/* ✅ 기존 아이콘: li의 오른쪽 상단 고정 */}
              {selectedTab === "inbox" && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "12px",
                    zIndex: 5,
                  }}
                >
                  <MailIcon
                    className={`text-xl ${
                      isRead ? "text-gray-400" : "text-blue-500"
                    }`}
                  />
                </div>
              )}

              {/* 제목 */}
              <div className="msg-item__title mb-1 pr-8 pl-6">
                {selectedTab === "notice"
                  ? `📢 ${getNoticeTitle(m)}`
                  : selectedTab === "inbox"
                  ? `보낸 사람: ${m.sender_nickname || m.sender_id}`
                  : `받는 사람: ${m.receiver_nickname || m.receiver_id}`}
              </div>

              {/* 미리보기 */}
              <div className="msg-item__preview pl-6">
                {(selectedTab === "notice"
                  ? getNoticeBody(m)
                  : m.content || ""
                ).slice(0, 10)}
                {(selectedTab === "notice"
                  ? getNoticeBody(m)
                  : m.content || ""
                ).length > 10 && "..."}
              </div>

              {/* 날짜 */}
              <div className="msg-item__meta text-xs text-gray-400 text-right mt-2">
                {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
