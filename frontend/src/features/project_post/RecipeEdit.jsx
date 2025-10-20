// /src/features/project_post/RecipeEdit.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import Modal from "../../components/Modal";
import "./RecipeCreate.css";

export default function RecipeEdit() {
  const { postId } = useParams();
  const navigate = useNavigate();

  // ===============================
  // 🧩 상태 정의
  // ===============================
  const [applicationFields, setApplicationFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [originalStartDate, setOriginalStartDate] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: "",
    description: "",
    capacity: 2,
    start_date: "",
    end_date: "",
    project_start: "",
    project_end: "",
    skills: [],
    application_fields: [],
    image_url: "",
    field: "",
    type: "",
  });

  // ===============================
  // 📥 기존 데이터 + 메타데이터 불러오기
  // ===============================
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await authFetch(`/recipe/${postId}`, { method: "GET" });

        setForm({
          title: res.title,
          description: res.description || "",
          capacity: res.capacity,
          start_date: res.start_date || "",
          end_date: res.end_date || "",
          project_start: res.project_start || "",
          project_end: res.project_end || "",
          skills: res.skills.map((s) => s.id),
          application_fields: res.application_fields.map((f) => f.id),
          image_url: res.image_url || "",
          field: res.field || "",
          type: res.type,
        });

        setOriginalStartDate(res.start_date || "");

        const resFields = await authFetch("/meta/required-fields", { method: "GET" });
        const resSkills = await authFetch("/meta/skills", { method: "GET" });
        setApplicationFields(resFields);
        setSkills(resSkills);
      } catch {
        setModalMessage("❌ 게시글을 불러오지 못했습니다.");
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [postId]);

  // ===============================
  // ⚙️ 입력 핸들러
  // ===============================
  const handleChange = (e) => {
    if (e.target.type === "file") {
      const file = e.target.files[0];
      if (file) uploadFile(file);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  // ===============================
  // 🖼 파일 업로드
  // ===============================
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();
      setForm((prev) => ({ ...prev, image_url: data.url }));
    } catch {
      setModalMessage("❌ 파일 업로드 실패");
      setShowModal(true);
    }
  };

  // ===============================
  // 🧩 선택 토글
  // ===============================
  const toggleSelection = (id, key) => {
    setForm((prev) => {
      const already = prev[key].includes(id);
      return {
        ...prev,
        [key]: already ? prev[key].filter((v) => v !== id) : [...prev[key], id],
      };
    });
  };

  // ===============================
  // 🔍 스킬 자동완성
  // ===============================
  useEffect(() => {
    if (skillSearch.trim() === "") setFilteredSkills([]);
    else {
      const results = skills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase())
      );
      setFilteredSkills(results);
    }
  }, [skillSearch, skills]);

  // ===============================
  // ⚙️ 스킬 추가/삭제
  // ===============================
  const addSkill = (skill) => {
    if (!form.skills.includes(skill.id))
      setForm({ ...form, skills: [...form.skills, skill.id] });
    setSkillSearch("");
    setFilteredSkills([]);
  };

  const removeSkill = (skillId) => {
    setForm({ ...form, skills: form.skills.filter((id) => id !== skillId) });
  };

  // ===============================
  // ✅ 검증 함수 (모집기간 + 프로젝트기간 포함)
  // ===============================
  const checkValid = () => {
    const titleOk = (form.title ?? "").trim().length >= 2;
    const descOk = (form.description ?? "").trim().length >= 5;
    const capOk = Number(form.capacity) >= 2;
    const typeOk = form.type === "PROJECT" || form.type === "STUDY";

    // 📅 날짜 4개 필수 + 논리적 순서 검증
    const sd = form.start_date ? new Date(form.start_date) : null;
    const ed = form.end_date ? new Date(form.end_date) : null;
    const ps = form.project_start ? new Date(form.project_start) : null;
    const pe = form.project_end ? new Date(form.project_end) : null;

    const allDatesFilled = sd && ed && ps && pe;
    // ✅ 수정됨: 프로젝트 시작일은 모집 종료일 이전이어도 됨 (단, 모집 시작일 이후여야 함)
    const periodOk =
      allDatesFilled &&
      sd <= ed && // 모집시작 ≤ 모집종료
      sd <= ps && // 프로젝트시작 ≥ 모집시작
      ps <= pe;   // 프로젝트종료 ≥ 프로젝트시작

    const notEarlierThanOriginal =
      !originalStartDate ||
      !form.start_date ||
      new Date(form.start_date) >= new Date(originalStartDate);

    return titleOk && descOk && capOk && typeOk && allDatesFilled && periodOk && notEarlierThanOriginal;
  };

  // ===============================
  // 📤 수정 요청
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!checkValid()) {
      setModalMessage("⚠️ 필수 항목(제목, 설명, 날짜)을 모두 입력해야 수정할 수 있습니다.");
      setShowModal(true);
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        capacity: form.capacity,
        type: form.type,
        field: form.field,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        project_start: form.project_start || null,
        project_end: form.project_end || null,
        skills: form.skills,
        application_fields: form.application_fields,
        image_url: form.image_url,
      };

      await authFetch(`/recipe/${postId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setModalMessage("✅ 수정이 완료되었습니다.");
      setShowModal(true);
      setTimeout(() => navigate(`/recipe/${postId}`), 1200);
    } catch (err) {
      setModalMessage("❌ 수정 실패: " + err.message);
      setShowModal(true);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  const workLabelPrefix = form.type === "STUDY" ? "스터디" : "프로젝트";

  // ===============================
  // 💄 UI 렌더링
  // ===============================
  return (
    <div className="recipe-create-container">
      <h2 className="recipe-create-title">모집공고 수정</h2>

      <form onSubmit={handleSubmit} className="recipe-form">
        {/* 제목 */}
        <div className="form-group">
          <label className="form-label">
            {form.type === "PROJECT" ? "프로젝트명" : "스터디명"} *
          </label>
          <input
            type="text"
            name="title"
            className="form-input"
            value={form.title}
            onChange={handleChange}
          />
        </div>

        {/* 설명 */}
        <div className="form-group">
          <label className="form-label">설명 *</label>
          <textarea
            name="description"
            className="form-textarea"
            value={form.description}
            onChange={handleChange}
          />
        </div>

        {/* 모집 인원 */}
        <div className="form-group">
          <label className="form-label">모집 인원 *</label>
          <input
            type="number"
            name="capacity"
            className="form-input"
            value={form.capacity}
            onChange={handleChange}
            min={2}
            max={50}
            step={1}
          />
        </div>

        {/* 모집 기간 */}
        <div className="date-group">
          <div className="form-group">
            <label className="form-label">모집 시작일 *</label>
            <input
              type="date"
              name="start_date"
              className="form-input"
              value={form.start_date}
              onChange={handleChange}
              min={originalStartDate || today}
            />
          </div>
          <div className="form-group">
            <label className="form-label">모집 종료일 *</label>
            <input
              type="date"
              name="end_date"
              className="form-input"
              value={form.end_date}
              onChange={handleChange}
              min={form.start_date || today}
            />
          </div>
        </div>

        {/* 프로젝트/스터디 기간 */}
        <div className="date-group">
          <div className="form-group">
            <label className="form-label">{workLabelPrefix} 시작일 *</label>
            <input
              type="date"
              name="project_start"
              className="form-input"
              value={form.project_start}
              onChange={handleChange}
              // ✅ 수정됨: 모집 시작일 이후면 가능
              min={form.start_date || today}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{workLabelPrefix} 종료일 *</label>
            <input
              type="date"
              name="project_end"
              className="form-input"
              value={form.project_end}
              onChange={handleChange}
              min={form.project_start || form.start_date || today}
            />
          </div>
        </div>

        {/* 분야 */}
        <div className="form-group">
          <label className="form-label">분야</label>
          <input
            type="text"
            name="field"
            className="form-input"
            value={form.field}
            onChange={handleChange}
            placeholder="예: 웹 개발, 앱 개발, 데이터 분석 등"
          />
        </div>

        {/* 사용 언어 */}
        <div className="form-group">
          <label className="form-label">사용 언어</label>
          <div className="skill-autocomplete">
            <input
              type="text"
              className="skill-search-input"
              placeholder="언어 검색..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />
            {filteredSkills.length > 0 && (
              <ul className="skill-dropdown">
                {filteredSkills.map((s) => (
                  <li
                    key={s.id}
                    className="skill-dropdown-item"
                    onClick={() => addSkill(s)}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="selected-skills">
            {form.skills.map((id) => {
              const item = skills.find((s) => s.id === id);
              const name = item ? item.name : id;
              return (
                <span
                  key={id}
                  className="skill-tag"
                  onClick={() => removeSkill(id)}
                >
                  {name} <span className="skill-tag-remove">×</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* 지원자 필수 입력값 */}
        <div className="form-group">
          <label className="form-label">지원자 필수 입력값</label>
          <div className="field-buttons">
            {applicationFields.map((field) => (
              <button
                key={field.id}
                type="button"
                className={`field-button ${
                  form.application_fields.includes(field.id) ? "active" : ""
                }`}
                onClick={() => toggleSelection(field.id, "application_fields")}
              >
                {field.name}
              </button>
            ))}
          </div>
        </div>

        {/* 대표 이미지 */}
        <div className="form-group">
          <label className="form-label">대표 이미지</label>
          <label className="image-upload-label">
            📁 이미지 선택
            <input
              type="file"
              name="file"
              className="image-upload-input"
              accept="image/*"
              onChange={handleChange}
            />
          </label>
        </div>

        {form.image_url && (
          <div className="image-preview-container">
            <img
              src={`http://localhost:8000${form.image_url}`}
              alt="대표 이미지"
              className="image-preview"
            />
          </div>
        )}

        {/* 제출 버튼 */}
        <button type="submit" className="submit-button">
          🛠 수정 완료
        </button>
      </form>

      {/* ✅ 모달 */}
      {showModal && (
        <Modal title="입력 확인" confirmText="확인" onConfirm={() => setShowModal(false)}>
          {modalMessage}
        </Modal>
      )}
    </div>
  );
}
