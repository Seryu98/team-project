import ReportItem from "./ReportItem";

export default function ReportList({ reports, onStatusChange }) {
  if (!reports.length) return <p>신고 내역이 없습니다.</p>;

  return (
    <div>
      {reports.map((r) => (
        <ReportItem key={r.id} report={r} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
