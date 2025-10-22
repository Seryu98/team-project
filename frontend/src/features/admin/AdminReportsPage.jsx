// features/admin/AdminReportsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./adminReports.css";

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🩵 [추가] 공통 API BASE URL 상수화
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // ✅ [추가] 모달 상태
  const [resolveModal, setResolveModal] = useState({
    open: false,
    mode: "user-comment", // 'user-comment' | 'post'
    report: null,
  });

  const [commentAction, setCommentAction] = useState("NONE");
  const [userAction, setUserAction] = useState("WARNING");
  const [reason, setReason] = useState("");

  // ✅ [추가] 신고 내용 펼침 여부 상태
  const [expandedId, setExpandedId] = useState(null);

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

  // ✅ 신고 목록을 유형별로 분류 (유저/댓글 vs 게시글)
  const userCommentReports = reports.filter((r) =>
    ["USER", "COMMENT", "MESSAGE"].includes(r.target_type)
  );
  const postReports = reports.filter((r) =>
    ["POST", "BOARD_POST"].includes(r.target_type)
  );

  // ✅ [수정] prompt → 드롭다운 모달로 교체
  async function handleResolveDynamic(report) {
    const { target_type } = report;

    if (["USER", "COMMENT", "MESSAGE"].includes(target_type)) {
      // ✅ 댓글/유저 신고 모달 열기
      openResolveModal(report, "user-comment");
    } else if (["POST", "BOARD_POST"].includes(target_type)) {
      // ✅ 게시글 신고 모달 열기
      openResolveModal(report, "post");
    } else {
      alert("처리할 수 없는 신고 유형입니다.");
    }
  }

  // ✅ 모달 열기/닫기 헬퍼
  function openResolveModal(report, mode) {
    setResolveModal({ open: true, mode, report });
    setCommentAction("NONE");
    setUserAction("WARNING");
    setReason("");
  }

  function closeResolveModal() {
    setResolveModal({ open: false, mode: "user-comment", report: null });
  }

  // ✅ 모달 내 "확인" 클릭 시 API 호출
  async function handleResolveModalConfirm() {
    const token = localStorage.getItem("access_token");
    const id = resolveModal.report.id;

    try {
      if (resolveModal.mode === "user-comment") {
        // ✅ 댓글/유저 신고 처리
        const res = await axios.post(
          `${base}/admin/reports/${id}/resolve/user-comment`,
          {
            comment_action: commentAction,
            user_action: userAction,
            reason: reason || "관리자 판단에 따라 처리되었습니다.",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.success) {
          alert("✅ 댓글/유저 신고 처리 완료");
        } else {
          alert(res.data?.message || "신고 처리 실패");
        }
      }
      // ✅ 게시글 신고 처리 (삭제 + 작성자 제재)
      else if (resolveModal.mode === "post") {
        const res = await axios.post(
          `${base}/admin/reports/${id}/resolve/post`,
          {
            post_action: "DELETE", // ✅ 게시글 삭제 포함
            user_action: userAction,
            reason: reason || "게시글이 규칙 위반으로 삭제되었습니다.",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.success) {
          alert(`✅ 게시글 삭제 및 작성자 제재 완료 (${userAction})`);
        } else {
          alert(res.data?.message || "신고 처리 실패");
        }
      }

      closeResolveModal();
      await fetchReports();
    } catch (err) {
      console.error("❌ 신고 처리 실패:", err);
      alert("서버 오류로 처리에 실패했습니다.");
    }
  }

  // ✅ 기존 handleResolve (반려용)는 그대로 둠
  async function handleResolve(id, actionType = "RESOLVE") {
    const reason = prompt("처리 사유를 입력하세요:");
    if (!reason) return alert("사유를 입력해야 합니다.");

    let penalty = "WARNING";
    if (actionType === "RESOLVE") {
      penalty = prompt(
        "제재 수준을 입력하세요 (WARNING / BAN_3DAYS / BAN_7DAYS / BAN_PERMANENT):",
        "WARNING"
      );
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
        alert(
          `✅ 신고 처리 완료 (${actionType === "RESOLVE" ? penalty : "반려"})`
        );
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
                    <p>
                      신고자: {r.reporter_nickname} → 피신고자:{" "}
                      <span style={{ color: "#dc2626" }}>
                        {r.reported_nickname}
                      </span>
                    </p>
                    <p className="report-reason">사유: {r.reason}</p>
                    <p className="report-target">
                      대상: {r.target_type} (ID: {r.target_id})
                    </p>

                    {/* ✅ 내용 보기 / 접기 버튼 */}
                    <button
                      className="toggle-btn"
                      onClick={() =>
                        setExpandedId(expandedId === r.id ? null : r.id)
                      }
                    >
                      {expandedId === r.id ? "내용 접기 ▲" : "내용 보기 ▼"}
                    </button>

                    {/* ✅ 댓글 내용 표시 (스크롤 포함) */}
                    {expandedId === r.id && (
                      <div className="report-content-box">
                        <h4>💬 신고된 댓글 내용</h4>
                        <div
                          className="scroll-box"
                          dangerouslySetInnerHTML={{
                            __html: r.comment_content || "<i>댓글 내용을 불러올 수 없습니다.</i>",
                          }}
                        />
                      </div>
                    )}


                    <div className="report-actions">
                      <button
                        className="report-btn btn-resolve"
                        onClick={() => handleResolveDynamic(r)}
                      >
                        처리
                      </button>
                      <button
                        className="report-btn btn-reject"
                        onClick={() => handleResolve(r.id, "REJECT")}
                      >
                        반려
                      </button>
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
                    <p>
                      신고자: {r.reporter_nickname} → 작성자:{" "}
                      <span style={{ color: "#dc2626" }}>
                        {r.reported_nickname}
                      </span>
                    </p>
                    <p className="report-reason">사유: {r.reason}</p>
                    <p className="report-target">
                      대상: {r.target_type} (ID: {r.target_id})
                    </p>

                    {/* ✅ 내용 보기 / 접기 버튼 */}
                    <button
                      className="toggle-btn"
                      onClick={() =>
                        setExpandedId(expandedId === r.id ? null : r.id)
                      }
                    >
                      {expandedId === r.id ? "내용 접기 ▲" : "내용 보기 ▼"}
                    </button>

                    {/* ✅ 게시글 내용 표시 (스크롤 포함) */}
                    {expandedId === r.id && (
                      <div className="report-content-box">
                        <h4>📄 신고된 게시글 내용</h4>
                        <div className="scroll-box">
                          <strong>{r.post_title || "(제목 없음)"}</strong>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: r.post_content || "<i>게시글 내용을 불러올 수 없습니다.</i>",
                            }}
                          />
                        </div>
                      </div>
                    )}


                    <div className="report-actions">
                      <button
                        className="report-btn btn-delete"
                        onClick={() => handleResolveDynamic(r)}
                      >
                        삭제 및 제재
                      </button>
                      <button
                        className="report-btn btn-reject"
                        onClick={() => handleResolve(r.id, "REJECT")}
                      >
                        반려
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ✅ 드롭다운 모달 */}
      {resolveModal.open && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {resolveModal.mode === "user-comment"
                ? "댓글/유저 신고 처리"
                : "게시글 신고 처리"}
            </h3>

            {resolveModal.mode === "user-comment" && (
              <>
                <label>댓글 조치</label>
                <select
                  value={commentAction}
                  onChange={(e) => setCommentAction(e.target.value)}
                >
                  <option value="NONE">NONE</option>
                  <option value="HIDE">HIDE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </>
            )}

            <label>유저 제재</label>
            <select
              value={userAction}
              onChange={(e) => setUserAction(e.target.value)}
            >
              <option value="NONE">NONE</option>
              <option value="WARNING">WARNING</option>
              <option value="BAN_3DAYS">BAN_3DAYS</option>
              <option value="BAN_7DAYS">BAN_7DAYS</option>
              <option value="BAN_PERMANENT">BAN_PERMANENT</option>
            </select>

            <label>사유</label>
            <textarea
              rows="3"
              placeholder="처리 사유를 입력하세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="modal-buttons">
              <button onClick={handleResolveModalConfirm}>확인</button>
              <button onClick={closeResolveModal}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
