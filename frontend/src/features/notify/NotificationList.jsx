// 알림 리스트 컴포넌트
// - 여러 알림(NotificationItem)을 받아서 출력
// - 알림이 없으면 "알림이 없습니다" 메시지 출력

import React from "react";
import NotificationItem from "./NotificationItem";

function NotificationList({ notifications, onRead }) {
  return (
    <div className="border rounded-md">
      {notifications.length === 0 ? (
        <p className="p-3 text-gray-500">알림이 없습니다.</p>
      ) : (
        notifications.map((n) => (
          <NotificationItem key={n.id} item={n} onRead={onRead} />
        ))
      )}
    </div>
  );
}

export default NotificationList;
