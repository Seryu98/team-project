import { useState } from "react";
import { updateReportStatus } from "./reportService";

const statusMap = { PENDING: "대기", RESOLVED: "승인됨", REJECTED: "거절됨" }; // ✅ 한국어 매핑

export default function ReportItem({ report, onStatusChange }) {
  const [busy, setBusy] = useState(false); // ✅ 중복 클릭 방지

  const handleUpdate = async (status) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await updateReportStatus(report.id, status);
      onStatusChange(updated);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === "string" ? detail : "상태 변경 실패"); // ✅ 안전 처리
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border rounded p-3 mb-2 bg-white shadow">
      <p><b>ID:</b> {report.id}</p>
      <p><b>신고자:</b> {report.reporter_user_id}</p>
      <p><b>피신고자:</b> {report.reported_user_id}</p>
      <p><b>대상:</b> {report.target_type} #{report.target_id}</p>
      <p><b>사유:</b> {report.reason}</p>
      <p><b>상태:</b> {statusMap[report.status] || report.status}</p> {/* ✅ 한국어화 */}

      {report.status === "PENDING" && (
        <div className="mt-2 space-x-2">
          <button
            onClick={() => handleUpdate("RESOLVED")}
            className="bg-green-500 text-white px-2 py-1 rounded disabled:opacity-60"
            disabled={busy} // ✅ 중복 방지
          >
            승인
          </button>
          <button
            onClick={() => handleUpdate("REJECTED")}
            className="bg-gray-500 text-white px-2 py-1 rounded disabled:opacity-60"
            disabled={busy} // ✅ 중복 방지
          >
            거절
          </button>
        </div>
      )}
    </div>
  );
}
