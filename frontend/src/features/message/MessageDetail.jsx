import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function MessageDetail() {
  const { id } = useParams();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function fetchMessage() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("로그인이 필요합니다.");
          return;
        }

        // 1️⃣ 현재 로그인한 사용자
        const userRes = await axios.get("http://localhost:8000/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(userRes.data);

        // 2️⃣ 메시지 상세
        const msgRes = await axios.get(`http://localhost:8000/messages/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!msgRes.data?.data) throw new Error("데이터가 없습니다.");
        setMessage(msgRes.data.data);

        // 3️⃣ 읽음 처리
        await axios.post(
          `http://localhost:8000/messages/${id}/read`,
          null,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error("❌ 메시지 상세 불러오기 실패:", err);
        if (err.response?.status === 404) setError("메시지를 찾을 수 없습니다.");
        else if (err.response?.status === 401)
          setError("인증이 만료되었습니다. 다시 로그인해주세요.");
        else setError("오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMessage();
  }, [id]);

  // ✅ message.content에서 application_id, post_id 추출
  const applicationId = message?.content?.match(/application_id=(\d+)/)?.[1];
  const postId = message?.content?.match(/post_id=(\d+)/)?.[1];

  async function decideApplication(accepted) {
    if (!applicationId || !postId) return alert("지원서 ID 또는 게시글 ID를 찾을 수 없습니다.");
    const token = localStorage.getItem("access_token");
    try {
      // ✅ 백엔드 구조에 맞춘 실제 요청 경로
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

  if (loading) return <p className="p-4">불러오는 중...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!message) return <p className="p-4 text-gray-600">메시지를 찾을 수 없습니다.</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">메시지 상세</h1>

      <div className="border rounded p-3 bg-white shadow-sm">
        <p className="mb-2">
          <strong>보낸 사람 ID:</strong> {message.sender_id}
        </p>
        <p className="mb-2">
          <strong>받은 사람 ID:</strong> {message.receiver_id}
        </p>
        <p className="my-3 whitespace-pre-line text-sm leading-relaxed">
          {message.content}
        </p>
        <p className="text-xs opacity-70">
          {new Date(message.created_at).toLocaleString()}
        </p>
      </div>

      {/* ✅ 리더(수신자)만 승인/거절 버튼 노출 */}
      {applicationId &&
        currentUser?.id === message.receiver_id &&
        message.application_status === "PENDING" && ( // ✅ 상태 확인 추가
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

    </div>
  );
}
