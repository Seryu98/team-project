// /src/features/project_post/RecipeCreate.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import Modal from "../../components/Modal";
import "./RecipeCreate.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function RecipeCreate() {
  const navigate = useNavigate();

  // ---------------------------------------
  // 🧩 상태 정의
  // ---------------------------------------
  const [type, setType] = useState("");
  const [applicationFields, setApplicationFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

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
  });

  // ---------------------------------------
  // 📥 메타데이터 불러오기
  // ---------------------------------------
  useEffect(() => {
    async function fetchMeta() {
      try {
        const resFields = await authFetch("/meta/required-fields", { method: "GET" });
        const resSkills = await authFetch("/meta/skills", { method: "GET" });
        setApplicationFields(resFields);
        setSkills(resSkills);
      } catch {
        setModalMessage("❌ 메타데이터를 불러오지 못했습니다.");
        setShowModal(true);
      }
    }
    fetchMeta();
  }, []);

  // ---------------------------------------
  // ⚙️ 입력 핸들러
  // ---------------------------------------
  const handleChange = (e) => {
    if (e.target.type === "file") {
      const file = e.target.files[0];
      if (file) uploadFile(file);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  // ---------------------------------------
  // 🖼️ 이미지 업로드
  // ---------------------------------------
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload/`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();
      setForm((prev) => ({ ...prev, image_url: data.url }));
    } catch {
      setModalMessage("❌ 파일 업로드 실패");
      setShowModal(true);
    }
  };

  // ---------------------------------------
  // 🎯 타입 선택
  // ---------------------------------------
  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setForm((prev) => ({ ...prev, type: selectedType }));
  };

  // ---------------------------------------
  // 🧩 지원자 입력값 선택 토글
  // ---------------------------------------
  const toggleSelection = (id, key) => {
    setForm((prev) => {
      const already = prev[key].includes(id);
      return {
        ...prev,
        [key]: already ? prev[key].filter((v) => v !== id) : [...prev[key], id],
      };
    });
  };

  // ---------------------------------------
  // 🔍 기술 스택 검색
  // ---------------------------------------
  useEffect(() => {
    if (skillSearch.trim() === "") setFilteredSkills([]);
    else {
      const results = skills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase())
      );
      setFilteredSkills(results);
    }
  }, [skillSearch, skills]);

  // ---------------------------------------
  // ⚙️ 스킬 추가/삭제
  // ---------------------------------------
  const addSkill = (skill) => {
    if (!form.skills.includes(skill.id)) {
      setForm({ ...form, skills: [...form.skills, skill.id] });
    }
    setSkillSearch("");
    setFilteredSkills([]);
  };

  const removeSkill = (skillId) => {
    setForm({ ...form, skills: form.skills.filter((id) => id !== skillId) });
  };

  // ---------------------------------------
  // ✅ 검증 함수 (날짜 포함)
  // ---------------------------------------
  const checkValid = () => {
    const titleOk = (form.title ?? "").trim().length >= 2;
    const descOk = (form.description ?? "").trim().length >= 5;
    const capOk = Number(form.capacity) >= 2;
    const typeOk = type === "PROJECT" || type === "STUDY";

    // 📅 날짜 검증 (모두 입력 + 순서 체크)
    const sd = form.start_date ? new Date(form.start_date) : null;
    const ed = form.end_date ? new Date(form.end_date) : null;
    const ps = form.project_start ? new Date(form.project_start) : null;
    const pe = form.project_end ? new Date(form.project_end) : null;

    const allDatesFilled = sd && ed && ps && pe;
    // ✅ 변경됨: 프로젝트 시작일은 모집 종료일 이후가 아니라, 모집 시작일 이후면 가능
    const periodOk =
      allDatesFilled &&
      sd <= ed &&  // 모집시작 ≤ 모집종료
      sd <= ps &&  // 프로젝트시작 ≥ 모집시작
      ps <= pe;    // 프로젝트종료 ≥ 프로젝트시작

    return titleOk && descOk && capOk && typeOk && allDatesFilled && periodOk;
  };

  // ---------------------------------------
  // 📤 등록 요청
  // ---------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!checkValid()) {
      setModalMessage("⚠️ 필수 항목(제목, 설명, 날짜)을 모두 입력해야 등록할 수 있습니다.");
      setShowModal(true);
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        capacity: form.capacity,
        type,
        field: form.field,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        project_start: form.project_start || null,
        project_end: form.project_end || null,
        skills: form.skills,
        application_fields: form.application_fields,
        image_url: form.image_url,
      };

      const res = await authFetch("/recipe/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setModalMessage("✅ 등록이 완료되었습니다.");
      setShowModal(true);
      setTimeout(() => navigate(`/recipe/${res.id}`), 1200);
    } catch (err) {
      setModalMessage("❌ 등록 실패: " + err.message);
      setShowModal(true);
    }
  };

  const workLabelPrefix = type === "STUDY" ? "스터디" : "프로젝트";

  // ---------------------------------------
  // 🧱 UI
  // ---------------------------------------
  return (
    <div className="recipe-create-container">
      <h2 className="recipe-create-title">모집공고 생성</h2>

      {/* 타입 선택 */}
      <div className="type-selector">
        <button
          type="button"
          className={`type-button ${type === "PROJECT" ? "active" : ""}`}
          onClick={() => handleTypeSelect("PROJECT")}
        >
          🚀 프로젝트
        </button>
        <button
          type="button"
          className={`type-button ${type === "STUDY" ? "active" : ""}`}
          onClick={() => handleTypeSelect("STUDY")}
        >
          📚 스터디
        </button>
      </div>

      {type && (
        <form onSubmit={handleSubmit} className="recipe-form">
          {/* 제목 */}
          <div className="form-group">
            <label className="form-label">
              {type === "PROJECT" ? "프로젝트명" : "스터디명"} *
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
            <label className="form-label">{type === "PROJECT" ? "설명" : "소개"} *</label>
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
                min={today}
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
                // ✅ 변경됨: 모집 종료일이 아니라 모집 시작일 이후면 가능
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
                    <li key={s.id} className="skill-dropdown-item" onClick={() => addSkill(s)}>
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
                  <span key={id} className="skill-tag" onClick={() => removeSkill(id)}>
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

          <button type="submit" className="submit-button">
            🎉 등록하기
          </button>
        </form>
      )}

      {showModal && (
        <Modal title="입력 확인" confirmText="확인" onConfirm={() => setShowModal(false)}>
          {modalMessage}
        </Modal>
      )}
    </div>
  );
}
