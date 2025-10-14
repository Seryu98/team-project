// src/features/message/MessageList.jsx
import React from "react";

export default function MessageList({ messages, selectedTab, onSelect }) {
  if (!messages || messages.length === 0)
    return (
      <p className="p-4 text-gray-500 text-center">
        쪽지가 없습니다.
      </p>
    );

  return (
    <ul className="divide-y">
      {messages.map((m) => (
        <li
          key={m.id}
          onClick={() => onSelect(m)}
          className="p-3 hover:bg-gray-100 cursor-pointer transition-colors"
        >
          {selectedTab === "notice" ? (
            <>
              <p className="font-semibold text-blue-600 flex items-center gap-1">
                📢 관리자 공지
              </p>
              <p className="text-sm text-gray-700 truncate">
                {m.title || "(제목 없음)"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(m.created_at).toLocaleString()}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-800">
                {selectedTab === "inbox"
                  ? `보낸 사람 ID: ${m.sender_id}`
                  : `받는 사람 ID: ${m.receiver_id}`}
              </p>

              {/* ✅ 쪽지 내용 요약 (앞 20자만 표시) */}
              <p className="text-sm text-gray-600 mt-1 truncate">
                {m.content?.slice(0, 20) || ""}
                {m.content?.length > 20 && "..."}
              </p>

              {/* ✅ 날짜 */}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(m.created_at).toLocaleString()}
              </p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
