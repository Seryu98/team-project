import { useEffect, useState } from "react";
import { getReports } from "./reportService";
import ReportList from "./ReportList";

export default function ReportAdminPage({ currentUser }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports({ page: 1, size: 20 });
        setReports(data);
      } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "신고 목록 불러오기 실패"); // ✅
    }
  };
    fetchReports();
  }, []);

  const handleStatusChange = (updated) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  if (currentUser?.role !== "ADMIN") {
    return <p>관리자 권한이 필요합니다.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">신고 관리</h2>
      {error ? <p className="text-red-500">{error}</p> : (
        <ReportList reports={reports} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
