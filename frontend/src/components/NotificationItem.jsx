// 📌 단일 알림 아이템 컴포넌트
// - props: 알림 데이터(item), 읽음 처리 함수(onRead)

import React from "react";

function NotificationItem({ item, onRead }) {
  return (
    <div className={`p-3 border-b ${item.is_read ? "bg-gray-100" : "bg-white"}`}>
      {/* 알림 메시지 */}
      <p className="font-medium">{item.message}</p>

      {/* 알림 생성 시각 */}
      <p className="text-sm text-gray-500">
        {new Date(item.created_at).toLocaleString()}
      </p>

      {/* 읽지 않은 알림만 "읽음 처리" 버튼 표시 */}
      {!item.is_read && (
        <button
          onClick={() => onRead(item.id)}
          className="mt-2 text-blue-500 text-sm"
        >
          읽음 처리
        </button>
      )}
    </div>
  );
}

export default NotificationItem;
