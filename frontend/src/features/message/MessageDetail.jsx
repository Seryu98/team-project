import React, { useEffect, useState } from "react";
import axios from "axios";
import { submitReport } from "../../shared/api/reportApi";

export default function MessageDetail({ message }) {
  const [msg, setMsg] = useState(message); // ✅ 상태로 관리
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ message prop이 바뀔 때마다 msg 동기화
  useEffect(() => {
    setMsg(message);
  }, [message]);

  // ✅ 로그인 사용자 불러오기
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await axios.get("http://localhost:8000/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.error("❌ 사용자 정보 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCurrentUser();
  }, []);

  // ✅ 메시지 상세 재조회 (application_status 포함)
  useEffect(() => {
    async function fetchDetail() {
      // ✅ [10/20] 공지사항은 별도 API 호출 불필요 → 상세 재조회 생략
      if (message?.category === "NOTICE") return;
      if (!message?.id) return;
      const token = localStorage.getItem("access_token");
      try {
        const { data } = await axios.get(`http://localhost:8000/messages/${message.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data?.data) setMsg(data.data); // ✅ 상세 데이터로 교체
      } catch (err) {
        console.error("❌ 쪽지 상세 불러오기 실패:", err);
      }
    }
    fetchDetail();
  }, [message?.id]);

  // ✅ 읽음 처리 (수신자일 때만)
  useEffect(() => {
    async function markAsRead() {
      if (!msg?.id) return;
      const token = localStorage.getItem("access_token");
      try {
        await axios.post(
          `http://localhost:8000/messages/${msg.id}/read`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        localStorage.setItem("refreshNotifications", "true");
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.error("❌ 읽음 처리 실패:", err);
      }
    }
    if (msg?.receiver_id === currentUser?.id) markAsRead();
  }, [msg, currentUser]);

  const applicationId = msg?.content?.match(/application_id=(\d+)/)?.[1];
  const postId = msg?.content?.match(/post_id=(\d+)/)?.[1];

  async function decideApplication(accepted) {
    if (!applicationId || !postId)
      return alert("지원서 ID 또는 게시글 ID를 찾을 수 없습니다.");

    const token = localStorage.getItem("access_token");
    try {
      const endpoint = accepted
        ? `http://localhost:8000/recipe/${postId}/applications/${applicationId}/approve`
        : `http://localhost:8000/recipe/${postId}/applications/${applicationId}/reject`;

      await axios.post(endpoint, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(accepted ? "지원서를 승인했습니다." : "지원서를 거절했습니다.");
      window.location.reload();
    } catch (err) {
      console.error("❌ 지원서 결정 실패:", err);
      alert("처리 중 오류가 발생했습니다.");
    }
  }

  // ✅ 디버깅 로그
  useEffect(() => {
    console.log("🧩 msg data:", msg);
    console.log("👉 msg.application_status:", msg?.application_status);
    console.log("👉 currentUser:", currentUser?.id, "receiver:", msg?.receiver_id);
  }, [msg, currentUser]);

  if (loading) return <p className="p-4 text-gray-500">불러오는 중...</p>;
  if (!msg) return <p className="p-4 text-gray-500">쪽지를 선택하세요.</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  // ✅ [추가됨 10/21] 공지사항(category === "NOTICE")일 때 별도 렌더링
  if (msg?.category === "NOTICE") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">📢 공지사항</h1>
        <div className="border rounded p-3 bg-white shadow-sm">
          <p className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</p>
          <p className="text-xs text-right opacity-60 mt-3">
            {new Date(msg.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  // ✅ 일반 쪽지 렌더링
  return (
    <div className="p-4">
      <h1 className="text-lg font-bold mb-4">쪽지 상세</h1>

      <div className="border rounded p-3 bg-white shadow-sm">
        <p className="text-sm mb-1">
          <strong>보낸 사람:</strong> {msg.sender_nickname || msg.sender_id}
        </p>
        <p className="text-sm mb-1">
          <strong>받은 사람:</strong> {msg.receiver_nickname || msg.receiver_id}
        </p>

        <div className="my-3 whitespace-pre-line text-sm leading-relaxed">
          {msg.content}
        </div>

        <p className="text-xs text-right opacity-60">
          {new Date(msg.created_at).toLocaleString()}
        </p>
      </div>

      {/* ✅ 리더만 승인/거절 버튼 표시 */}
      {applicationId &&
        currentUser?.id === msg.receiver_id &&
        msg.application_status?.toUpperCase?.() === "PENDING" && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => decideApplication(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              승인
            </button>
            <button
              onClick={() => decideApplication(false)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              거절
            </button>
          </div>
        )}

      {/* ✅ 신고 버튼 */}
      {currentUser?.id === msg.receiver_id && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={async () => {
              const reason = prompt("신고 사유를 입력해주세요:");
              if (!reason?.trim()) return alert("신고 사유를 입력해야 합니다.");
              try {
                await submitReport("MESSAGE", msg.id, reason);
                alert("🚨 신고가 접수되었습니다.");
              } catch (err) {
                console.error("❌ 신고 실패:", err);
                alert("신고 중 오류가 발생했습니다.");
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            🚨 신고
          </button>
        </div>
      )}
    </div>
  );
}
