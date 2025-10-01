import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import FormInput from "./RecipeFormInput";

export default function RecipeCreate() {
  const [type, setType] = useState(""); // PROJECT or STUDY
  const [applicationFields, setApplicationFields] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    capacity: 2, // ✅ 기본값도 2명부터
    start_date: "",
    end_date: "",
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

      // authFetch는 JSON 전용이라 파일 업로드는 fetch 직접 사용
      const res = await fetch("http://localhost:8000/upload/", {
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
    setForm({ ...form, type: selectedType });
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
    try {
      const payload = {
        title: form.title,
        description: form.description,
        capacity: form.capacity,
        type: type,
        field: form.field,
        start_date: form.start_date,
        end_date: form.end_date,
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
            min={2}  // ✅ 최소 2명
            required
          />

          <FormInput
            label="모집 시작일"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
          />
          <FormInput
            label="모집 종료일"
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
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
