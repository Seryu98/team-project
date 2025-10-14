// src/features/message/MessageSidebar.jsx
import React from "react";

export default function MessageSidebar({ selectedTab, setSelectedTab }) {
  const menu = [
    { key: "notice", label: "📢 관리자 공지" },
    { key: "compose", label: "✉️ 쪽지 작성" },
    { key: "inbox", label: "📥 받은 쪽지함" },
    { key: "sent", label: "📤 보낸 쪽지함" },
  ];

  return (
    <div className="w-56 border-r bg-white flex flex-col">
      <h2 className="text-lg font-bold p-4 border-b">쪽지함</h2>
      {menu.map((m) => (
        <button
          key={m.key}
          onClick={() => setSelectedTab(m.key)}
          className={`text-left px-4 py-2 hover:bg-gray-100 ${
            selectedTab === m.key ? "bg-gray-200 font-semibold" : ""
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
