// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending_posts: 0,
    pending_reports: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("http://localhost:8000/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data.data || {});
    } catch (err) {
      console.error("❌ 관리자 통계 불러오기 실패:", err);
    }
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div
          className="bg-blue-100 p-4 rounded-lg shadow cursor-pointer hover:bg-blue-200"
          onClick={() => navigate("/admin/pending")}
        >
          <h2 className="text-xl font-semibold">승인 대기 게시글</h2>
          <p className="text-3xl mt-2 font-bold text-blue-800">
            {stats.pending_posts}
          </p>
        </div>

        <div
          className="bg-red-100 p-4 rounded-lg shadow cursor-pointer hover:bg-red-200"
          onClick={() => navigate("/admin/reports")}
        >
          <h2 className="text-xl font-semibold">신고 처리 대기</h2>
          <p className="text-3xl mt-2 font-bold text-red-800">
            {stats.pending_reports}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <p className="text-gray-600">
          👋 관리자님, 오늘도 좋은 하루입니다!  
          아래 메뉴에서 승인 및 신고 처리를 진행하세요.
        </p>
      </div>
    </div>
  );
}
