import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { createReport } from "../reports/ReportService"; // ✅ ReportService 사용

export default function MessageDetailPage({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportReason, setReportReason] = useState(""); // ✅ 신고 사유 입력 state

  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const token = localStorage.getItem("token");

  // ✅ 쪽지 불러오기 + 읽음 처리
  const fetchMessage = async () => {
    if (!id || !currentUser) return;
    setLoading(true);
    try {
      const res = await axios.get(`${base}/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data);

      // 수신자가 본인이고 안 읽었으면 읽음 처리
      if (res.data.receiver_id === currentUser?.id && !res.data.is_read) {
        await axios.patch(`${base}/messages/${id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage((prev) => (prev ? { ...prev, is_read: true } : prev));
      }
    } catch (err) {
      console.error("쪽지 상세 조회 실패", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 쪽지 삭제
  const handleDelete = async () => {
    if (!window.confirm("이 쪽지를 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${base}/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("삭제되었습니다.");
      navigate("/messages");
    } catch (err) {
      console.error("쪽지 삭제 실패", err);
      alert("삭제에 실패했습니다.");
    }
  };

  // ✅ 신고하기
  const handleReport = async () => {
    try {
      if (!reportReason.trim()) {
        alert("신고 사유를 입력해주세요.");
        return;
      }

      const payload = {
        target_type: "USER",                // 신고 타입
        target_id: message?.id,             // 메시지 ID
        reported_user_id: message?.sender_id, // 신고 대상 유저 ID
        reason: reportReason,               // 입력한 사유
      };

      console.log("🚨 신고 요청 payload:", payload);
      await createReport(payload);
      alert("신고가 접수되었습니다.");
    } catch (error) {
      console.error("신고 실패", error);
      alert("신고에 실패했습니다.");
    }
  };

  useEffect(() => {
    fetchMessage();
  }, [id, currentUser]);

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        <p>로그인 후 이용할 수 있습니다.</p>
      </div>
    );
  }

  if (loading) return <div className="p-6">불러오는 중...</div>;
  if (!message) return <div className="p-6">쪽지를 찾을 수 없습니다.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto border rounded-lg shadow bg-white">
      <h1 className="text-xl font-bold mb-4">쪽지 상세</h1>

      <div className="mb-4">
        <p>
          <span className="font-semibold">보낸 사람:</span>{" "}
          {message.sender_name} (ID: {message.sender_id})
        </p>
        <p>
          <span className="font-semibold">받는 사람:</span>{" "}
          {message.receiver_name} (ID: {message.receiver_id})
        </p>
        <p className="text-sm text-gray-500">
          {new Date(message.created_at).toLocaleString()}
        </p>
      </div>

      <div className="p-4 border rounded bg-gray-50 mb-6">
        {message.content}
      </div>

      {/* ✅ 신고 사유 입력 */}
      <div className="mb-4">
        <textarea
          className="w-full border rounded p-2"
          placeholder="신고 사유를 입력하세요"
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
        />
      </div>

      <div className="flex justify-between gap-2">
        <button
          onClick={() => navigate("/messages")}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          목록으로
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleReport}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            신고하기
          </button>

          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
