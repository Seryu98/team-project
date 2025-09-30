// src/components/applications/ApplicationList.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchApplications, processApplication } from "./applicationService";

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function ApplicationList({ postId: propPostId }) {
  const query = useQuery();
  const postId = propPostId ?? (query.get("post_id") ? Number(query.get("post_id")) : undefined);

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setLoading(true);
    fetchApplications(postId)
      .then(setApps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleProcess = async (id, status) => {
    try {
      const updated = await processApplication(id, status); // "APPROVED" | "REJECTED"
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-2">불러오는 중...</div>;
  if (error) return <div className="p-2 text-red-600">에러: {error}</div>;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">지원 내역</h2>
      {apps.length === 0 ? (
        <p>아직 지원 내역이 없습니다.</p>
      ) : (
        apps.map((app) => (
          <div key={app.id} className="border p-4 my-2 rounded shadow">
            <p><b>지원자:</b> {app.user_id}</p>
            <p><b>상태:</b> {app.status}</p>

            <div className="mt-3">
              <b>답변</b>
              <ul className="list-disc ml-5 mt-1">
                {app.answers?.map((ans, idx) => (
                  <li key={idx}>
                    <span className="font-medium">[{ans.field_id}]</span> {ans.answer_text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3">
              <button
                onClick={() => handleProcess(app.id, "APPROVED")}
                className="px-3 py-1 bg-green-600 text-white rounded mr-2"
              >
                승인
              </button>
              <button
                onClick={() => handleProcess(app.id, "REJECTED")}
                className="px-3 py-1 bg-red-600 text-white rounded"
              >
                거절
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ApplicationList;
