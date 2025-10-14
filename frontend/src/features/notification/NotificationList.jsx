// src/components/NotificationPopup.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function NotificationPopup({ onClose }) {
  const [items, setItems] = useState([]);

  async function fetchList() {
    const { data } = await axios.get("/notifications", { params: { only_unread: false } });
    if (data?.data) setItems(data.data);
  }

  useEffect(() => {
    fetchList();
  }, []);

  function onClickItem(n) {
    if (n.type === "MESSAGE") {
      window.location.href = `/messages/${n.related_id}`;
    }
    onClose?.(); // 팝업 닫기
  }

  return (
    <div
      className="absolute right-0 top-10 w-72 bg-white border shadow-lg rounded-lg z-50"
      style={{ maxHeight: "400px", overflowY: "auto" }}
    >
      <div className="flex justify-between items-center px-3 py-2 border-b">
        <span className="font-semibold text-sm">알림</span>
        <button onClick={onClose} className="text-gray-500 text-sm">✕</button>
      </div>

      <ul className="divide-y text-sm">
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => onClickItem(n)}
            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            <div>{n.message}</div>
            <div className="text-xs text-gray-400">{n.created_at}</div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-4 text-center text-gray-400">알림이 없습니다.</li>
        )}
      </ul>
    </div>
  );
}
