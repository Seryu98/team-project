import { useState } from "react";
import { createReport } from "./reportService";
import ReportForm from "./ReportForm";

export default function ReportPage() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false); // ✅ 중복 제출 방지

  const handleSubmit = async (payload) => {
    if (submitting) return;          // ✅ 가드
    setSubmitting(true);
    setMessage("");

    try {
      await createReport(payload);
      setMessage("신고가 접수되었습니다.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setMessage(typeof detail === "string" ? detail : "신고에 실패했습니다."); // ✅ 안전 처리
      console.error("신고 실패", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">신고하기</h2>
      <ReportForm onSubmit={handleSubmit} />
      {submitting && <p className="mt-3 text-sm text-gray-500">처리 중...</p>}
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
