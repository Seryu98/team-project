// src/pages/MessagesPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MessagesPage({ currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inbox"); // inbox | sent
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ 쪽지 불러오기
  const fetchMessages = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

      const url =
        activeTab === "inbox"
          ? `${base}/messages/inbox/${currentUser.id}`
          : `${base}/messages/sent/${currentUser.id}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data);
    } catch (err) {
      console.error("쪽지 조회 실패", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ activeTab or currentUser 변경 시 다시 불러오기
  useEffect(() => {
    if (currentUser) {
      fetchMessages();
    }
  }, [currentUser, activeTab]);

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        <p>로그인 후 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">쪽지함</h1>

      {/* ✅ 받은함/보낸함 탭 */}
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === "inbox" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("inbox")}
        >
          받은 쪽지
        </button>
        <button
          className={`px-4 py-2 rounded ${
            activeTab === "sent" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("sent")}
        >
          보낸 쪽지
        </button>
      </div>

      {/* ✅ 메시지 목록 */}
      {loading ? (
        <p>불러오는 중...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">
          {activeTab === "inbox" ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
        </p>
      ) : (
        <div className="border rounded-lg divide-y">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-4 cursor-pointer ${
                m.is_read ? "bg-white" : "bg-blue-50"
              } hover:bg-gray-100`}
              onClick={() => navigate(`/messages/${m.id}`)}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">
                  {activeTab === "inbox" ? m.sender_name : `To: ${m.sender_name}`}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-gray-700 truncate">{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
