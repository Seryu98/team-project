// /src/features/project_post/RecipeCreate.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import FormInput from "./RecipeFormInput";
import "./RecipeCreate.css"; // ✅ CSS 임포트

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function RecipeCreate() {
  const [type, setType] = useState("");
  const [applicationFields, setApplicationFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const navigate = useNavigate();

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

  // 📌 DB에서 메타데이터 가져오기
  useEffect(() => {
    async function fetchMeta() {
      try {
        const resFields = await authFetch("/meta/required-fields", {
          method: "GET",
        });
        const resSkills = await authFetch("/meta/skills", { method: "GET" });
        setApplicationFields(resFields);
        setSkills(resSkills);
      } catch (err) {
        console.error("❌ 메타데이터 불러오기 실패:", err);
      }
    }
    fetchMeta();
  }, []);

  const handleChange = (e) => {
    if (e.target.type === "file") {
      const file = e.target.files[0];
      if (file) {
        uploadFile(file);
      }
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/upload/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();

      setForm((prev) => ({ ...prev, image_url: data.url }));
      console.log("✅ 업로드 성공:", data.url);
    } catch (err) {
      console.error("❌ 파일 업로드 실패:", err);
      alert("파일 업로드 실패");
    }
  };

  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setForm((prev) => ({ ...prev, type: selectedType }));
  };

  const toggleSelection = (id, key) => {
    setForm((prev) => {
      const already = prev[key].includes(id);
      return {
        ...prev,
        [key]: already
          ? prev[key].filter((v) => v !== id)
          : [...prev[key], id],
      };
    });
  };

  useEffect(() => {
    if (skillSearch.trim() === "") {
      setFilteredSkills([]);
    } else {
      const results = skills.filter((s) =>
        s.name.toLowerCase().includes(skillSearch.toLowerCase())
      );
      setFilteredSkills(results);
    }
  }, [skillSearch, skills]);

  const addSkill = (skill) => {
    if (!form.skills.includes(skill.id)) {
      setForm({ ...form, skills: [...form.skills, skill.id] });
    }
    setSkillSearch("");
    setFilteredSkills([]);
  };

  const removeSkill = (skillId) => {
    setForm({
      ...form,
      skills: form.skills.filter((id) => id !== skillId),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type) {
      alert("프로젝트 또는 스터디를 선택해주세요.");
      return;
    }
    try {
      const payload = {
        title: form.title,
        description: form.description,
        capacity: form.capacity,
        type: type,
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

      alert("✅ 등록 완료!\nID: " + res.id);
      navigate(`/recipe/${res.id}`);
    } catch (err) {
      console.error(err);
      alert("❌ 오류 발생: " + err.message);
    }
  };

  const workLabelPrefix = type === "STUDY" ? "스터디" : "프로젝트";

  return (
    <div className="recipe-create-container">
      <h2 className="recipe-create-title"> 모집공고 생성</h2>

      {/* 타입 선택 버튼 */}
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
              placeholder={`${type === "PROJECT" ? "프로젝트" : "스터디"} 이름을 입력하세요`}
              required
            />
          </div>

          {/* 설명 */}
          <div className="form-group">
            <label className="form-label">
              {type === "PROJECT" ? "설명" : "소개"} *
            </label>
            <textarea
              name="description"
              className="form-textarea"
              value={form.description}
              onChange={handleChange}
              placeholder={`${type === "PROJECT" ? "프로젝트" : "스터디"}에 대해 자세히 설명해주세요`}
              required
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
              required
            />
            <p className="helper-text">최소 2명 ~ 최대 50명</p>
          </div>

          {/* 모집 기간 */}
          <div className="date-group">
            <div className="form-group">
              <label className="form-label">모집 시작일</label>
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
              <label className="form-label">모집 종료일</label>
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
              <label className="form-label">{workLabelPrefix} 시작일</label>
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
              <label className="form-label">{workLabelPrefix} 종료일</label>
              <input
                type="date"
                name="project_end"
                className="form-input"
                value={form.project_end}
                onChange={handleChange}
                min={form.project_start || today}
              />
            </div>
          </div>

          {type === "PROJECT" && (
            <>
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
            </>
          )}

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
            🎉 등록하기
          </button>
        </form>
      )}
    </div>
  );
}