// src/features/message/MessagesPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import MessageSidebar from "./MessageSidebar";
import MessageList from "./MessageList";
import MessageDetail from "./MessageDetail";
import MessageCompose from "./MessageCompose";

export default function MessagesPage() {
  const [selectedTab, setSelectedTab] = useState("inbox"); // inbox | sent | notice | compose
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ 메시지 목록 불러오기
  async function fetchMessages() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = "";
      if (selectedTab === "inbox") url = "http://localhost:8000/messages";
      else if (selectedTab === "sent") url = "http://localhost:8000/messages/sent";
      else if (selectedTab === "notice") url = "http://localhost:8000/announcements";

      if (!url) return;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.data || []);
    } catch (err) {
      console.error("❌ 메시지 목록 불러오기 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedTab !== "compose") fetchMessages();
  }, [selectedTab]);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      {/* ✅ 왼쪽 메뉴 */}
      <MessageSidebar selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

      {/* ✅ 중앙 목록 */}
      <div className="flex-1 border-l border-r bg-white overflow-y-auto">
        {loading ? (
          <p className="p-4">불러오는 중...</p>
        ) : selectedTab === "compose" ? (
          <MessageCompose onSent={() => setSelectedTab("sent")} />
        ) : (
          <MessageList
            messages={messages}
            selectedTab={selectedTab}
            onSelect={setSelectedMessage}
          />
        )}
      </div>

      {/* ✅ 오른쪽 상세보기 */}
      <div className="w-1/3 bg-white border-l overflow-y-auto">
        {selectedMessage ? (
          <MessageDetail message={selectedMessage} />
        ) : (
          <p className="p-4 text-gray-500">쪽지를 선택하세요.</p>
        )}
      </div>
    </div>
  );
}
