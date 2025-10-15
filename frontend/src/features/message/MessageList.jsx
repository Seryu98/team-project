// src/features/message/MessageList.jsx
import React from "react";
import { FaEnvelope, FaEnvelopeOpen } from "react-icons/fa"; 

export default function MessageList({ messages, selectedTab, onSelect }) {
  if (!messages || messages.length === 0) {
    return <p className="p-4 text-gray-500">쪽지가 없습니다.</p>;
  }

  const getNoticeTitle = (m) => m.title || m.subject || "공지";
  const getNoticeBody  = (m) => m.content || m.body || "";

  return (
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
            {/* ✅ 아이콘: li의 진짜 오른쪽 상단 고정 */}
            {selectedTab === "inbox" && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "12px", // 🔹 더 오른쪽으로 보냄
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
            <div className="msg-item__title mb-1 pr-8">
              {selectedTab === "notice"
                ? `📢 ${getNoticeTitle(m)}`
                : selectedTab === "inbox"
                ? `보낸 사람: ${m.sender_nickname || m.sender_id}`
                : `받는 사람: ${m.receiver_nickname || m.receiver_id}`}
            </div>

            {/* 미리보기 */}
            <div className="msg-item__preview">
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
  );
}
