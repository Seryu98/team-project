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

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
    setSelectAll(!selectAll);
  };

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
      <div className="flex items-center gap-3 mb-2">
        <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
        {selectedTab === "trash" ? (
          <button
            onClick={handleRestore}
            className="px-2 py-1 bg-green-500 text-white rounded"
          >
            복원
          </button>
        ) : (
          <button
            onClick={handleDelete}
            className="px-2 py-1 bg-red-500 text-white rounded"
          >
            삭제
          </button>
        )}
        <span className="text-sm text-gray-500">
          {selectedIds.length > 0 && `${selectedIds.length}개 선택됨`}
        </span>
      </div>

      <ul className="msg-list__ul">
        {messages.map((m) => {
          const isRead = !!m.is_read;
          const MailIcon = isRead ? FaEnvelopeOpen : FaEnvelope;
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
              <input
                type="checkbox"
                className="absolute left-2 top-4"
                checked={selectedIds.includes(m.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectOne(m.id);
                }}
              />
              {selectedTab === "inbox" && (
                <div
                  style={{ position: "absolute", top: "10px", right: "12px" }}
                >
                  <MailIcon
                    className={`text-xl ${
                      isRead ? "text-gray-400" : "text-blue-500"
                    }`}
                  />
                </div>
              )}
              <div className="msg-item__title mb-1 pr-8 ml-6">
                {selectedTab === "notice"
                  ? `📢 ${m.title || "공지"}`
                  : selectedTab === "inbox"
                  ? `보낸 사람: ${m.sender_nickname || m.sender_id}`
                  : `받는 사람: ${m.receiver_nickname || m.receiver_id}`}
              </div>
              <div className="msg-item__preview ml-6">
                {(m.content || "").slice(0, 15)}
                {(m.content || "").length > 15 && "..."}
              </div>
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
