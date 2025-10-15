// features/admin/AdminReportsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("http://localhost:8000/admin/pending-reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data.data || []);
    } catch (err) {
      console.error("❌ 신고 목록 불러오기 실패:", err);
    }
  }

  async function handleResolve(id, action) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        `http://localhost:8000/admin/reports/${id}/resolve`,
        null,
        {
          params: { action },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert(action === "RESOLVE" ? "✅ 신고 처리 완료" : "🚫 신고 반려 완료");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("❌ 신고 처리 실패:", err);
      alert("처리 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">신고 처리 관리</h1>
      {reports.length === 0 ? (
        <p>처리할 신고가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="border p-3 rounded-lg flex justify-between">
              <div>
                <p className="font-semibold">신고 #{r.id}</p>
                <p className="text-sm text-gray-600">
                  대상: {r.target_type} / 사유: {r.reason}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResolve(r.id, "RESOLVE")}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  처리
                </button>
                <button
                  onClick={() => handleResolve(r.id, "REJECT")}
                  className="bg-gray-500 text-white px-3 py-1 rounded"
                >
                  반려
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
