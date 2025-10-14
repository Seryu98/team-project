// src/features/message/MessageList.jsx
import React from "react";

export default function MessageList({ messages, selectedTab, onSelect }) {
  if (messages.length === 0)
    return <p className="p-4 text-gray-500">쪽지가 없습니다.</p>;

  return (
    <ul>
      {messages.map((m) => (
        <li
          key={m.id}
          onClick={() => onSelect(m)}
          className="border-b p-3 hover:bg-gray-50 cursor-pointer"
        >
          {selectedTab === "notice" ? (
            <>
              <p className="font-semibold">📢 {m.title}</p>
              <p className="text-sm text-gray-500">{m.created_at}</p>
            </>
          ) : (
            <>
              <p className="font-semibold">
                {selectedTab === "inbox"
                  ? `보낸 사람: ${m.sender_id}`
                  : `받는 사람: ${m.receiver_id}`}
              </p>
              <p className="text-sm text-gray-600">
                {m.content.slice(0, 20)}...
              </p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
