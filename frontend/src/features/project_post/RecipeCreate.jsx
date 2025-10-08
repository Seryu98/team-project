// /src/features/project_post/RecipeCreate.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import FormInput from "./RecipeFormInput";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function RecipeCreate() {
  // ✅ 타입은 버튼으로 설정: PROJECT / STUDY
  const [type, setType] = useState(""); // PROJECT or STUDY

  const [applicationFields, setApplicationFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0]; // ✅ 오늘 날짜 문자열

  const [form, setForm] = useState({
    title: "",
    description: "",
    capacity: 2, // ✅ 기본값 2명
    start_date: "",
    end_date: "",
    project_start: "",
    project_end: "",
    skills: [],
    application_fields: [], // ✅ 지원자 필수 입력값
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

  // 입력 핸들러
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

  // 📌 파일 업로드 → URL 저장
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // ✅ 수정된 부분
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

  // 타입 선택 핸들러
  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    // 폼에도 type을 포함해서 백엔드로 전송
    setForm((prev) => ({ ...prev, type: selectedType }));
  };

  // 📌 application_fields 버튼 토글
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

  // 📌 skills 검색 자동완성
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

  // 제출
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

        // 🔥 type은 버튼에서 선택된 state 사용
        type: type, // <- 중요

        field: form.field,

        // ✅ 빈 문자열이면 null 로 변환
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
      // ✅ 등록 후 상세페이지로 이동
      navigate(`/recipe/${res.id}`);
    } catch (err) {
      console.error(err);
      alert("❌ 오류 발생: " + err.message);
    }
  };

  // ✅ 라벨 프리픽스: 프로젝트/스터디에 따라 변경
  const workLabelPrefix = type === "STUDY" ? "스터디" : "프로젝트";

  return (
    <div style={{ maxWidth: "700px", margin: "auto" }}>
      <h2>모집공고 생성</h2>

      {/* 타입 선택 버튼 */}
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => handleTypeSelect("PROJECT")}
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            border: "1px solid black",
            backgroundColor: type === "PROJECT" ? "#4caf50" : "white",
          }}
        >
          프로젝트
        </button>
        <button
          type="button"
          onClick={() => handleTypeSelect("STUDY")}
          style={{
            padding: "10px 20px",
            border: "1px solid black",
            backgroundColor: type === "STUDY" ? "#4caf50" : "white",
          }}
        >
          스터디
        </button>
      </div>

      {type && (
        <form onSubmit={handleSubmit}>
          <FormInput
            label={type === "PROJECT" ? "프로젝트명" : "스터디명"}
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>
              {type === "PROJECT" ? "설명" : "소개"}
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <FormInput
            label="모집 인원"
            name="capacity"
            type="number"
            value={form.capacity}
            onChange={handleChange}
            min={2} // ✅ 최소 2명
            max={50} // ✅ 최대 50명
            step={1} // ✅ 정수만
            required
          />

          {/* 모집 기간 */}
          <FormInput
            label="모집 시작일"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            min={today} // ✅ 오늘 이전 선택 불가
          />
          <FormInput
            label="모집 종료일"
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
            min={form.start_date || today} // ✅ 시작일 이후만 선택 가능
          />

          {/* 프로젝트/스터디 기간 → 라벨 동적 변경 */}
          <FormInput
            label={`${workLabelPrefix} 시작일`}
            name="project_start"
            type="date"
            value={form.project_start}
            onChange={handleChange}
            min={form.start_date || today} // ✅ 모집 "시작일" 이후부터 가능
          />
          <FormInput
            label={`${workLabelPrefix} 종료일`}
            name="project_end"
            type="date"
            value={form.project_end}
            onChange={handleChange}
            min={form.project_start || today} // ✅ (프로젝트/스터디) 시작일 이후만
          />

          {type === "PROJECT" && (
            <>
              <FormInput
                label="분야"
                name="field"
                value={form.field}
                onChange={handleChange}
              />

              {/* 📌 skills 자동완성 */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontWeight: "bold" }}>
                  사용 언어
                </label>
                <input
                  type="text"
                  placeholder="언어 검색..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  style={{ width: "100%", padding: "8px" }}
                />
                {filteredSkills.length > 0 && (
                  <ul
                    style={{
                      border: "1px solid #ccc",
                      marginTop: "5px",
                      maxHeight: "150px",
                      overflowY: "auto",
                      padding: "0",
                      listStyle: "none",
                    }}
                  >
                    {filteredSkills.map((s) => (
                      <li
                        key={s.id}
                        onClick={() => addSkill(s)}
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          backgroundColor: "#f9f9f9",
                        }}
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: "10px" }}>
                  {form.skills.map((id) => {
                    const item = skills.find((s) => s.id === id);
                    const name = item ? item.name : id;
                    return (
                      <span
                        key={id}
                        style={{
                          display: "inline-block",
                          padding: "5px 10px",
                          margin: "5px",
                          border: "1px solid black",
                          borderRadius: "5px",
                          background: "#e0e0e0",
                        }}
                        onClick={() => removeSkill(id)}
                      >
                        {name} ✕
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold" }}>
              지원자 필수 입력값
            </label>
            {applicationFields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => toggleSelection(field.id, "application_fields")}
                style={{
                  margin: "5px",
                  padding: "8px 15px",
                  border: "1px solid black",
                  backgroundColor: form.application_fields.includes(field.id)
                    ? "#4caf50"
                    : "white",
                }}
              >
                {field.name}
              </button>
            ))}
          </div>

          <FormInput
            label="대표 이미지"
            name="file"
            type="file"
            onChange={handleChange}
          />

          {form.image_url && (
            <div style={{ marginTop: "1rem" }}>
              <img
                src={`http://localhost:8000${form.image_url}`}
                alt="대표 이미지"
                style={{ maxWidth: "200px", border: "1px solid #ccc" }}
              />
            </div>
          )}

          <button
            type="submit"
            style={{ padding: "10px 20px", marginTop: "1rem" }}
          >
            등록하기
          </button>
        </form>
      )}
    </div>
  );
}