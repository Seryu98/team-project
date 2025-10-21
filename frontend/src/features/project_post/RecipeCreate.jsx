// /src/features/project_post/RecipeCreate.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import Modal from "../../components/Modal";
import RichTextEditor from "../../components/RichTextEditor";
import "./RecipeCreate.css";

// ========================================
// 🤖 AI 관련 import
// ========================================
import AIModal from "./components/AIModal";
import { PROJECT_EXAMPLE, STUDY_EXAMPLE } from "./components/examples";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function RecipeCreate() {
  const navigate = useNavigate();

  // =======================================
  // 🧩 상태 정의
  // =======================================
  const [type, setType] = useState(""); // 프로젝트 / 스터디 타입
  const [applicationFields, setApplicationFields] = useState([]); // 지원서 필드 목록
  const [skills, setSkills] = useState([]); // 스킬 목록
  const [skillSearch, setSkillSearch] = useState(""); // 스킬 검색 키워드
  const [filteredSkills, setFilteredSkills] = useState([]); // 검색 결과
  const [showModal, setShowModal] = useState(false); // 일반 모달
  const [modalMessage, setModalMessage] = useState(""); // 모달 메시지
  const [showAIModal, setShowAIModal] = useState(false); // ✅ AI 모달
  const today = new Date().toISOString().split("T")[0]; // 오늘 날짜

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

  // =======================================
  // 📥 메타데이터 불러오기
  // =======================================
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

  // =======================================
  // ⚙️ 입력 핸들러
  // =======================================
  const handleChange = (e) => {
    if (e.target.type === "file") {
      const file = e.target.files[0];
      if (file) uploadFile(file);
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  // =======================================
  // 🖼️ 이미지 업로드
  // =======================================
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
  const convertNewlinesToHTML = (text) => {
    return text.replace(/\n/g, "<br>");
  };
  // =======================================
  // 🎯 타입 선택 (프로젝트 / 스터디)
  // =======================================
  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setForm((prev) => ({
      ...prev,
      type: selectedType,
      // ✅ 프로젝트는 PROJECT_EXAMPLE, 스터디는 STUDY_EXAMPLE 자동 입력
      description: selectedType === "PROJECT" ? convertNewlinesToHTML(PROJECT_EXAMPLE)
        : convertNewlinesToHTML(STUDY_EXAMPLE),
    }));
  };

  // =======================================
  // 🧩 지원자 필수 입력값 토글
  // =======================================
  const toggleSelection = (id, key) => {
    setForm((prev) => {
      const already = prev[key].includes(id);
      return {
        ...prev,
        [key]: already ? prev[key].filter((v) => v !== id) : [...prev[key], id],
      };
    });
  };

  // =======================================
  // 🔍 기술 스택 자동완성
  // =======================================
  useEffect(() => {
    if (skillSearch.trim() === "") setFilteredSkills([]);
    else {
      const results = skills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase())
      );
      setFilteredSkills(results);
    }
  }, [skillSearch, skills]);

  // =======================================
  // ⚙️ 스킬 추가/삭제
  // =======================================
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

  // =======================================
  // ✅ 유효성 검증 (날짜 포함)
  // =======================================
  const checkValid = () => {
    const titleOk = (form.title ?? "").trim().length >= 2;
    const descOk = (form.description ?? "").trim().length >= 5;
    const capOk = Number(form.capacity) >= 2;
    const typeOk = type === "PROJECT" || type === "STUDY";

    const sd = form.start_date ? new Date(form.start_date) : null;
    const ed = form.end_date ? new Date(form.end_date) : null;
    const ps = form.project_start ? new Date(form.project_start) : null;
    const pe = form.project_end ? new Date(form.project_end) : null;

    const allDatesFilled = sd && ed && ps && pe;
    const periodOk = allDatesFilled && sd <= ed && sd <= ps && ps <= pe;

    return titleOk && descOk && capOk && typeOk && allDatesFilled && periodOk;
  };

  // =======================================
  // 📤 등록 요청
  // =======================================
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

  // ✅ prefix (스터디 / 프로젝트)
  const workLabelPrefix = type === "STUDY" ? "스터디" : "프로젝트";

  // =======================================
  // 🧱 UI 렌더링
  // =======================================
  return (
    <div className="recipe-create-container">
      <h2 className="recipe-create-title">모집공고 생성</h2>

      {/* ------------------------------------ */}
      {/* 🎯 타입 선택 */}
      {/* ------------------------------------ */}
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

          {/* 설명 / 소개 */}
          <div className="form-group description-group">
            <div className="description-header">
              <label className="form-label">
                {type === "PROJECT" ? "설명" : "소개"} *
              </label>

              {/* ✅ 프로젝트 타입일 때만 AI 버튼 표시 */}
              {type === "PROJECT" && (
                <button
                  type="button"
                  className="ai-generate-button"
                  onClick={() => setShowAIModal(true)}
                >
                  🤖 AI 설명 생성
                </button>
              )}
            </div>

            <RichTextEditor
              value={form.description}
              onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
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

          {/* 분야 (프로젝트 전용) */}
          {type === "PROJECT" && (
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
          )}

          {/* 기술 스택 (프로젝트 전용) */}
          {type === "PROJECT" && (
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
          )}

          {/* 지원자 필수 입력값 */}
          <div className="form-group">
            <label className="form-label">지원자 필수 입력값</label>
            <div className="field-buttons">
              {applicationFields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  className={`field-button ${form.application_fields.includes(field.id) ? "active" : ""
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
            🎉 등록하기
          </button>
        </form>
      )}

      {/* 일반 모달 */}
      {showModal && (
        <Modal title="입력 확인" confirmText="확인" onConfirm={() => setShowModal(false)}>
          {modalMessage}
        </Modal>
      )}

      {/* ✅ AI 모달 */}
      {showAIModal && (
        <AIModal
          onClose={() => setShowAIModal(false)}
          onResult={(desc) => setForm((prev) => ({ ...prev, description: desc }))}
        />
      )}
    </div>
  );
}
