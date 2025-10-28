// src/features/message/MessageList.jsx
import React, { useState } from "react";
import axios from "axios";
import { FaEnvelope, FaEnvelopeOpen } from "react-icons/fa";

export default function MessageList({ messages, selectedTab, onSelect, refreshList }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  if (!messages || messages.length === 0) {
    return <p className="p-4 text-gray-500">쪽지가 없습니다.</p>;
  }

  // ✅ 전체 선택 / 해제
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
    setSelectAll(!selectAll);
  };

   // ✅ 개별 선택
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ✅ 휴지통으로 이동
  const handleDelete = async () => {
    if (selectedIds.length === 0) return alert("삭제할 메시지를 선택하세요.");
    if (!confirm("선택한 메시지를 휴지통으로 이동하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      await axios.post(`${base}/messages/trash`, selectedIds, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("선택한 메시지가 휴지통으로 이동되었습니다.");
      if (refreshList) await refreshList(); // ✅ 즉시 새로고침
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error("❌ 삭제 실패:", err);
    }
  };

  // ♻️ 휴지통 복원
  const handleRestore = async () => {
    if (selectedIds.length === 0) return alert("복원할 메시지를 선택하세요.");
    if (!confirm("선택한 메시지를 복원하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      await axios.post(`${base}/messages/trash/restore`, selectedIds, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("선택한 메시지가 복원되었습니다.");
      if (refreshList) await refreshList();
      setSelectedIds([]);
      setSelectAll(false);
    } catch (err) {
      console.error("❌ 복원 실패:", err);
    }
  };

  return (
    <div>
      {/* ================================
          🆕 상단 컨트롤 영역 수정됨
          - 기존: flex + gap-3 구조
          - 변경: .msg-list__header-controls (CSS 적용)
      ================================= */}
      <div className="msg-list__header-controls"> {/* 🆕 추가됨 */}
        {/* ✅ 왼쪽: 체크박스 + 선택 개수 */}
        <div className="msg-list__header-left"> {/* 🆕 추가됨 */}
          <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
          <span>{selectedIds.length > 0 && `${selectedIds.length}개 선택됨`}</span>
        </div>

        {/* ✅ 오른쪽: 삭제 / 복원 버튼 */}
        <div className="msg-list__header-right"> {/* 🆕 추가됨 */}
          {selectedTab === "trash" ? (
            <button onClick={handleRestore} className="restore-btn">복원</button>
          ) : (
            <button onClick={handleDelete}>삭제</button>
          )}
        </div>
      </div>

      {/* ================================
          📨 쪽지 목록
      ================================= */}
      <ul className="msg-list__ul">
        {messages.map((m) => {
          const isRead = !!m.is_read;
          const MailIcon = isRead ? FaEnvelopeOpen : FaEnvelope;

          return (
            <li
              key={m.id}
              className={`msg-item ${!isRead ? "unread" : ""}`} // 🩵 수정됨: Tailwind 대신 msg-item 사용
              onClick={() => {
                if (!m.is_read) m.is_read = 1;
                onSelect && onSelect(m);
              }}
            >
              {/* 🩵 체크박스 위치 유지 (CSS로 정렬됨) */}
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectOne(m.id);
                }}
              />

              {/* 🩵 우측 상단 읽음/안읽음 아이콘 */}
              {selectedTab === "inbox" && (
                <div style={{ position: "absolute", top: "10px", right: "12px" }}>
                  <MailIcon
                    className={`text-xl ${
                      isRead ? "text-gray-400" : "text-blue-500"
                    }`}
                  />
                </div>
              )}

              {/* 제목 */}
              <div className="msg-item__title mb-1 pr-8 ml-6">
                {selectedTab === "notice"
                  ? `📢 ${m.title || "공지"}`
                  : selectedTab === "inbox"
                  ? `보낸 사람: ${m.sender_nickname || m.sender_id}`
                  : `받는 사람: ${m.receiver_nickname || m.receiver_id}`}
              </div>

              {/* 미리보기 */}
              <div className="msg-item__preview ml-6">
                {(m.content || "").slice(0, 15)}
                {(m.content || "").length > 15 && "..."}
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