// /src/features/project_post/RecipeEdit.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import FormInput from "./RecipeFormInput";

export default function RecipeEdit() {
  const { postId } = useParams();   // ✅ URL에서 postId 가져오기
  const navigate = useNavigate();

  const [applicationFields, setApplicationFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);

  const [loading, setLoading] = useState(true);

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
    type: "",   // PROJECT / STUDY
  });

  // 📌 기존 게시글 + 메타데이터 불러오기
  useEffect(() => {
    async function fetchData() {
      try {
        // 게시글 상세
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

        // 메타데이터
        const resFields = await authFetch("/meta/required-fields", {
          method: "GET",
        });
        const resSkills = await authFetch("/meta/skills", { method: "GET" });
        setApplicationFields(resFields);
        setSkills(resSkills);
      } catch (err) {
        alert("❌ 게시글 불러오기 실패: " + err.message);
        navigate("/posts");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [postId, navigate]);

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

  // 📌 파일 업로드
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
    } catch (err) {
      alert("❌ 파일 업로드 실패");
    }
  };

  // 📌 application_fields 토글
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

  // 📌 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
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

      alert("✅ 수정 완료!");
      navigate(`/recipe/${postId}`);
    } catch (err) {
      alert("❌ 수정 실패: " + err.message);
    }
  };

  if (loading) return <p>로딩 중...</p>;

  const workLabelPrefix = form.type === "STUDY" ? "스터디" : "프로젝트";

  return (
    <div style={{ maxWidth: "700px", margin: "auto" }}>
      <h2>모집공고 수정</h2>

      <form onSubmit={handleSubmit}>
        <FormInput
          label={form.type === "PROJECT" ? "프로젝트명" : "스터디명"}
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontWeight: "bold" }}>
            {form.type === "PROJECT" ? "설명" : "소개"}
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
          min={2}
          max={50}
          step={1}
          required
        />

        <FormInput
          label="모집 시작일"
          name="start_date"
          type="date"
          value={form.start_date}
          onChange={handleChange}
          min={today}
        />
        <FormInput
          label="모집 종료일"
          name="end_date"
          type="date"
          value={form.end_date}
          onChange={handleChange}
          min={form.start_date || today}
        />

        <FormInput
          label={`${workLabelPrefix} 시작일`}
          name="project_start"
          type="date"
          value={form.project_start}
          onChange={handleChange}
          min={form.start_date || today}
        />
        <FormInput
          label={`${workLabelPrefix} 종료일`}
          name="project_end"
          type="date"
          value={form.project_end}
          onChange={handleChange}
          min={form.project_start || today}
        />

        {form.type === "PROJECT" && (
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
          수정 완료
        </button>
      </form>
    </div>
  );
}
