// src/features/message/MessageInbox.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MessageInbox() {
  // 한 줄 요약 주석: 메시지함 (수신함)
  const [items, setItems] = useState([]);

  async function fetchInbox() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("http://localhost:8000/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("📩 메시지 응답:", res.data);
      setItems(res.data.data || []); // ✅ 백엔드 구조 맞게 data.data
    } catch (err) {
      console.error("❌ 메시지 불러오기 실패:", err);
    }
  }

  useEffect(() => {
    fetchInbox();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">메시지함</h1>
      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.id} className="border rounded p-2 flex items-center justify-between">
            <div className="text-sm">{m.content.slice(0, 80)}</div>
            <a href={`/messages/${m.id}`} className="text-sm underline">자세히</a>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm opacity-70">수신된 메시지가 없습니다.</p>}
      </ul>
    </div>
  );
}
