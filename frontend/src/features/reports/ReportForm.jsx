import { useState } from "react";

export default function ReportForm({ onSubmit }) {
  const [targetType, setTargetType] = useState("POST");
  const [targetId, setTargetId] = useState("");
  const [reportedUserId, setReportedUserId] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // USER 신고
    if (targetType === "USER") {
      if (!reportedUserId || !reason) {
        alert("피신고자 ID와 사유를 입력해주세요.");
        return;
      }
      const idNum = Number(reportedUserId);
      onSubmit({
        target_type: "USER",
        target_id: idNum,             // ✅ USER는 target_id == reported_user_id
        reported_user_id: idNum,
        reason,
      });
      return;
    }

    // 비-USER 신고
    if (!targetId || !reportedUserId || !reason) {
      alert("대상 ID, 피신고자 ID, 사유를 모두 입력해주세요.");
      return;
    }
    onSubmit({
      target_type: targetType,
      target_id: Number(targetId),
      reported_user_id: Number(reportedUserId),  // ✅ 항상 포함
      reason,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        대상 유형:
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="border rounded p-1 ml-2"
        >
          <option value="POST">게시글</option>
          <option value="BOARD_POST">게시판 글</option>
          <option value="COMMENT">댓글</option>
          <option value="USER">사용자</option>
        </select>
      </label>

      {targetType !== "USER" && (
        <label className="block">
          대상 ID:
          <input
            type="number"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="border rounded p-1 ml-2"
          />
        </label>
      )}

      {/* ✅ 모든 신고에서 피신고자 ID 필요 (USER는 이 값이 target_id와 동일) */}
      <label className="block">
        피신고자(사용자) ID:
        <input
          type="number"
          value={reportedUserId}
          onChange={(e) => setReportedUserId(e.target.value)}
          className="border rounded p-1 ml-2"
        />
      </label>

      <label className="block">
        신고 사유:
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border rounded w-full p-2"
        />
      </label>

      <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded">
        신고하기
      </button>
    </form>
  );
}
