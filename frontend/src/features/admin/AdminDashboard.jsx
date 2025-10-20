// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending_posts: 0,
    pending_reports: 0,
  });

  // [추가 10/18] 공지사항 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sendResult, setSendResult] = useState("");

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

  // [추가됨 10/18] 공지사항 발송 함수
  async function handleSendAnnouncement() {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.post(
        "http://localhost:8000/messages/admin/announcement",
        null,
        {
          params: { title, content },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSendResult(`✅ ${res.data.message} (${res.data.data.count}명에게 전송됨)`);
      setTitle("");
      setContent("");
    } catch (err) {
      console.error("❌ 공지사항 전송 실패:", err);
      setSendResult("❌ 공지사항 전송 실패. 콘솔을 확인하세요.");
    }
  }

  // ✅ [수정 시작] Tailwind → CSS 클래스 기반으로 전체 구조 리디자인
  return (
    <div className="admin-dashboard"> {/* ✅ 기존 p-6 → CSS 전용 컨테이너 */}
      <h1 className="admin-title text-3xl font-bold mb-6">관리자 대시보드</h1>
      console.log("✅ 현재 AdminDashboard 렌더링됨");

      {/* ✅ 기존 grid → 커스텀 그리드 */}
      <div className="dashboard-grid">
        <div
          className="dashboard-card card-blue"
          onClick={() => navigate("/admin/pending")}
        >
          <h2>승인 대기 게시글</h2>
          <p>{stats.pending_posts}</p>
        </div>

        <div
          className="dashboard-card card-red"
          onClick={() => navigate("/admin/reports")}
        >
          <h2>신고 처리 대기</h2>
          <p>{stats.pending_reports}</p>
        </div>

        {/* ✅ 새로 추가된 제재 유저 관리 */}
        <div
          className="dashboard-card card-gray"
          onClick={() => navigate("/admin/users")}
        >
          <h2>제재 유저 관리</h2>
          <p>⚙️</p>
        </div>
      </div>

      {/* ✅ 기존 안내문 → 카드 스타일 문단 */}
      <div className="admin-message mt-10">
        👋 관리자님, 오늘도 좋은 하루입니다!  
        아래 메뉴에서 승인 및 신고 처리를 진행하세요.
      </div>

      {/* ✅ [추가됨 10/18] 전체 공지사항 발송 UI */}
      <div className="announcement-box mt-12 p-6 border rounded-lg shadow-md bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">📢 전체 공지사항 발송</h2>
        <input
          type="text"
          placeholder="공지 제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="announcement-input w-full border p-2 rounded mb-2"
        />
        <textarea
          placeholder="공지 내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="announcement-textarea w-full border p-2 rounded mb-3 h-32"
        />
        <button
          onClick={handleSendAnnouncement}
          className="announcement-button bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          🚀 공지사항 보내기
        </button>
        {sendResult && (
          <p className="announcement-result mt-3 text-sm text-gray-700">{sendResult}</p>
        )}
      </div>
    </div>
  );
  // ✅ [수정 끝]
}