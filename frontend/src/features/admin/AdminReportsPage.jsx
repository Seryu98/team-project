// features/admin/AdminReportsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/admin/pending-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setReports(res.data.data || []);
      } else {
        alert(res.data?.message || "신고 목록을 불러오지 못했습니다.");
      }
    } catch (err) {
      console.error("❌ 신고 목록 불러오기 실패:", err);
      alert("서버 오류로 신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id, actionType = "RESOLVE") {
    const reason = prompt("처리 사유를 입력하세요:");
    if (!reason) return alert("사유를 입력해야 합니다.");

    let penalty = "WARNING";
    if (actionType === "RESOLVE") {
      penalty = prompt("제재 수준을 입력하세요 (WARNING / BAN_3DAYS / BAN_7DAYS / BAN_PERMANENT):", "WARNING");
      if (!penalty) return alert("제재 수준을 입력해야 합니다.");
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/admin/reports/${id}/resolve`,
        { action: actionType, reason, penalty_type: penalty },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        alert(`✅ 신고 처리 완료 (${actionType === "RESOLVE" ? penalty : "반려"})`);
        setReports((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.data?.message || "신고 처리 실패");
      }
    } catch (err) {
      console.error("❌ 신고 처리 오류:", err);
      alert("서버 오류로 처리에 실패했습니다.");
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🛠️ 신고 처리 관리</h1>

      {loading ? (
        <p className="text-gray-500">로딩 중...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-600">처리할 신고가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold text-lg">🚨 신고 #{r.id}</p>
                  <p className="text-sm text-gray-600">
                    신고자: <span className="font-medium">{r.reporter_nickname}</span> → 피신고자:{" "}
                    <span className="font-medium text-red-600">{r.reported_nickname}</span>
                  </p>
                  <p className="text-sm mt-1">사유: {r.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">대상: {r.target_type} (ID: {r.target_id})</p>
                </div>

                <div className="flex gap-2 items-start">
                  <button
                    onClick={() => handleResolve(r.id, "RESOLVE")}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    처리
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "REJECT")}
                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                  >
                    반려
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}