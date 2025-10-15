// src/features/message/MessageList.jsx
import React from "react";

export default function MessageList({ messages, selectedTab, onSelect }) {
  if (!messages || messages.length === 0) {
    return <p className="p-4 text-gray-500">쪽지가 없습니다.</p>;
  }

  // 공지 본문/제목 필드가 API마다 다를 수 있어 안전하게 처리
  const getNoticeTitle = (m) => m.title || m.subject || "공지";
  const getNoticeBody  = (m) => m.content || m.body || "";

  return (
    <ul className="msg-list__ul">
      {messages.map((m) => (
        <li
          key={m.id}
          className="msg-item"
          onClick={() => onSelect && onSelect(m)}
        >
          {/* 제목 영역 */}
          <div className="msg-item__title">
            {selectedTab === "notice" ? (
              `📢 ${getNoticeTitle(m)}`
            ) : selectedTab === "inbox" ? (
              `보낸 사람: ${m.sender_nickname || m.sender_id}`
            ) : (
              `받는 사람: ${m.receiver_nickname || m.receiver_id}`
            )}
          </div>

          {/* 미리보기(20~40자 정도) */}
          <div className="msg-item__preview">
            {selectedTab === "notice"
              ? getNoticeBody(m).slice(0, 40)
              : (m.content || "").slice(0, 40)}
            {(selectedTab === "notice"
              ? getNoticeBody(m)
              : (m.content || "")
            ).length > 40 && "..."}
          </div>

          {/* 날짜/메타 */}
          <div className="msg-item__meta">
            {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}
