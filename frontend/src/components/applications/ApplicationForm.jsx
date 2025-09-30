// src/components/applications/ApplicationForm.jsx
import { useEffect, useMemo, useState } from "react";
import { getRequiredFields, submitApplication } from "../../services/applicationService";

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function ApplicationForm({ postId: propPostId }) {
  const query = useQuery();
  const postId = propPostId ?? Number(query.get("post_id"));

  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) return;
    getRequiredFields(postId).then(setFields).catch(console.error);
  }, [postId]);

  const onChange = (fid, val) => setValues((prev) => ({ ...prev, [fid]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postId) return alert("post_id가 필요합니다.");

    const answers = fields.map((f) => ({
      field_id: f.field_id,
      answer_text: values[f.field_id] || "",
    }));
    if (answers.some((a) => !a.answer_text?.trim())) {
      return alert("모든 필수 질문에 답변해 주세요.");
    }

    try {
      setLoading(true);
      await submitApplication(postId, answers);
      alert("지원서가 제출되었습니다.");
      setValues({});
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!postId) return <div className="p-4">post_id가 필요합니다. (?post_id=123)</div>;

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded shadow">
      <h3 className="font-bold mb-3">지원서 작성</h3>
      {fields.length === 0 && <p>필수 질문이 없습니다.</p>}
      {fields.map((f) => (
        <div key={f.field_id} className="mb-3">
          <label className="block text-sm font-medium mb-1">{f.name}</label>
          <textarea
            value={values[f.field_id] || ""}
            onChange={(e) => onChange(f.field_id, e.target.value)}
            className="w-full border p-2 rounded"
            placeholder={`${f.name}을(를) 입력하세요`}
            required
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? "제출 중..." : "제출하기"}
      </button>
    </form>
  );
}

export default ApplicationForm;
