// features/admin/AdminReportsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./adminReports.css";

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 🩵 [추가] 공통 API BASE URL 상수화
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${base}/admin/pending-reports`, {
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
  

  // ✅ [추가] 신고 목록을 유형별로 분류 (유저/댓글 vs 게시글)
  const userCommentReports = reports.filter((r) =>
    ["USER", "COMMENT", "MESSAGE"].includes(r.target_type)
  );
  const postReports = reports.filter((r) =>
    ["POST", "BOARD_POST"].includes(r.target_type)
  );

  // ✅ [추가] 신고 타입별 처리 분기 (USER/COMMENT/POST)
  async function handleResolveDynamic(report) {
    const token = localStorage.getItem("access_token");
    const { id, target_type } = report;

    // 댓글/유저 제재 처리
    if (["USER", "COMMENT", "MESSAGE"].includes(target_type)) {
      const comment_action = prompt("댓글 조치 (NONE / HIDE / DELETE):", "NONE");
      const user_action = prompt("유저 제재 (NONE / WARNING / BAN_3DAYS / BAN_7DAYS / BAN_PERMANENT):", "WARNING");
      const reason = prompt("처리 사유를 입력하세요:", "부적절한 게시물");

      if (!reason) return alert("사유는 반드시 입력해야 합니다.");

      try {
        const res = await axios.post(
          `${base}/admin/reports/${id}/resolve/user-comment`,
          { comment_action, user_action, reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.success) {
          alert(`✅ 댓글/유저 신고 처리 완료 (${user_action})`);
          await fetchReports();
        } else {
          alert(res.data?.message || "신고 처리 실패");
        }
      } catch (err) {
        console.error("❌ 댓글/유저 신고 처리 실패:", err);
        alert("서버 오류로 처리에 실패했습니다.");
      }
    }

    // ✅ [수정] 게시글 제재 처리 (단일 요청으로 처리 — 중복 요청 제거)
    else if (["POST", "BOARD_POST"].includes(target_type)) {
      const post_action = prompt("게시글 조치 (DELETE만 허용):", "DELETE");
      if (post_action !== "DELETE") return alert("게시글은 DELETE만 가능합니다.");

      const user_action = prompt(
        "게시글 작성자 제재 수준 (NONE / WARNING / BAN_3DAYS / BAN_7DAYS / BAN_PERMANENT):",
        "WARNING"
      );
      const reason = prompt("처리 사유를 입력하세요:", "게시글 부적절한 내용");
      if (!reason) return alert("사유는 반드시 입력해야 합니다.");

      try {
        // 🩵 [수정] 한 번의 요청으로 게시글 삭제 + 작성자 제재를 동시에 처리
        const res = await axios.post(
          `${base}/admin/reports/${id}/resolve/post`,
          { post_action, user_action, reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.success) {
          alert(`✅ 게시글 삭제 및 작성자 제재 완료 (${user_action})`);
          await fetchReports();
        } else {
          alert(res.data?.message || "신고 처리 실패");
        }
      } catch (err) {
        console.error("❌ 게시글 신고 처리 실패:", err);
        alert("서버 오류로 처리에 실패했습니다.");
      }
    } else {
      alert("처리할 수 없는 신고 유형입니다.");
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
        `${base}/admin/reports/${id}/resolve`,
        { action: actionType, reason, penalty_type: penalty },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        alert(`✅ 신고 처리 완료 (${actionType === "RESOLVE" ? penalty : "반려"})`);
        await fetchReports();
      } else {
        alert(res.data?.message || "신고 처리 실패");
      }
    } catch (err) {
      console.error("❌ 신고 처리 오류:", err);
      alert("서버 오류로 처리에 실패했습니다.");
    }
  }

return (
  <div className="admin-reports-container">
    <h1>🛠️ 신고 처리 관리</h1>

    {loading ? (
      <p className="empty-text">로딩 중...</p>
    ) : (
      <div className="report-sections">
        {/* 👤 유저/댓글 신고 */}
        <section className="report-section">
          <h2>👤 유저 / 댓글 신고</h2>
          {userCommentReports.length === 0 ? (
            <p className="empty-text">처리할 유저/댓글 신고가 없습니다.</p>
          ) : (
            <ul className="report-list">
              {userCommentReports.map((r) => (
                <li key={r.id} className="report-item">
                  <p className="report-id">🚨 신고 #{r.id}</p>
                  <p>신고자: {r.reporter_nickname} → 피신고자: <span style={{ color: "#dc2626" }}>{r.reported_nickname}</span></p>
                  <p className="report-reason">사유: {r.reason}</p>
                  <p className="report-target">대상: {r.target_type} (ID: {r.target_id})</p>

                  <div className="report-actions">
                    <button className="report-btn btn-resolve" onClick={() => handleResolveDynamic(r)}>처리</button>
                    <button className="report-btn btn-reject" onClick={() => handleResolve(r.id, "REJECT")}>반려</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 🧾 게시글 신고 */}
        <section className="report-section">
          <h2>🧾 게시글 신고</h2>
          {postReports.length === 0 ? (
            <p className="empty-text">처리할 게시글 신고가 없습니다.</p>
          ) : (
            <ul className="report-list">
              {postReports.map((r) => (
                <li key={r.id} className="report-item">
                  <p className="report-id">🚨 신고 #{r.id}</p>
                  <p>신고자: {r.reporter_nickname} → 작성자: <span style={{ color: "#dc2626" }}>{r.reported_nickname}</span></p>
                  <p className="report-reason">사유: {r.reason}</p>
                  <p className="report-target">대상: {r.target_type} (ID: {r.target_id})</p>

                  <div className="report-actions">
                    <button className="report-btn btn-delete" onClick={() => handleResolveDynamic(r)}>삭제 및 제재</button>
                    <button className="report-btn btn-reject" onClick={() => handleResolve(r.id, "REJECT")}>반려</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    )}
  </div>
);
}
