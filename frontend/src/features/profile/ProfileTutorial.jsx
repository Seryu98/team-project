// src/features/profile/ProfileTutorial.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

function buildIconMap(globs) {
  const map = {};
  for (const [path, url] of Object.entries(globs)) {
    const base = path.split("/").pop().replace(".png", "").toLowerCase();
    map[base] = url;
  }
  return map;
}

const skillGlob1 = import.meta.glob("../../shared/assets/skills/*.png", { eager: true, as: "url" });
const skillGlob2 = import.meta.glob("../../app/shared/assets/skills/*.png", { eager: true, as: "url" });
const starGlob1 = import.meta.glob("../../shared/assets/star/*.png", { eager: true, as: "url" });
const starGlob2 = import.meta.glob("../../app/shared/assets/star/*.png", { eager: true, as: "url" });

export default function ProfileTutorial() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    headline: "",
    bio: "",
    experience: "",
    certifications: "",
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);

  const SKILL_ICONS = useMemo(
    () => ({ ...buildIconMap(skillGlob1), ...buildIconMap(skillGlob2) }),
    []
  );
  const STAR_ICONS = useMemo(
    () => ({ ...buildIconMap(starGlob1), ...buildIconMap(starGlob2) }),
    []
  );

  const oneStarUrl = STAR_ICONS["onestar"] || "/assets/star/onestar.png";
  const zeroStarUrl = STAR_ICONS["zerostar"] || "/assets/star/zerostar.png";

  const resolveSkillIconUrl = (rawName) => {
    if (!rawName) return "";
    let norm = String(rawName).trim().toLowerCase().replace(/\s+/g, "_");
    const aliases = {
      "react native": "react_native",
      "react-native": "react_native",
      reactnative: "react_native",
      "c#": "csharp",
      "c++": "cplus",
      "f#": "fsharp",
      objectivec: "objectivec",
      "objective-c": "objectivec",
      "objective c": "objectivec",
      "postgre_sql": "postgresql",
      "ms_sql_server": "mssqlserver",
    };
    norm = aliases[norm] || norm;
    if (SKILL_ICONS[norm]) return SKILL_ICONS[norm];
    return `/assets/skills/${rawName.replace(/\s+/g, "_")}.png`;
  };

  const totalSteps = 7;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const hasInput = () => {
    if (currentStep === 0) return false;
    if (currentStep === 1) return previewImage !== null;
    if (currentStep === 2) return form.headline;
    if (currentStep === 3) return form.bio;
    if (currentStep === 4) return form.experience;
    if (currentStep === 5) return form.certifications;
    if (currentStep === 6) return selectedSkills.length > 0;
    return false;
  };

  const getButtonText = () => {
    if (currentStep === 0) return "시작하기";
    return hasInput() ? "다음" : "건너뛰기";
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewImage(localUrl);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      const normalizedQuery = query.trim().replace(/\s+/g, "_");
      const res = await api.get(`/skills/search?q=${normalizedQuery}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = res.data.filter(
        (s) => !selectedSkills.some((my) => my.id === s.id)
      );
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddSkill = (skill, level) => {
    setSelectedSkills((prev) => [...prev, { ...skill, level }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveSkill = (skillId) => {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const handleUpdateSkillLevel = (skillId, newLevel) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, level: newLevel } : s))
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("access_token");

    // 1. 프로필 이미지 업로드
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await api.post("/profiles/me/image", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
    }

    // 2. 프로필 정보 저장
    await api.put(
      "/profiles/me",
      {
        headline: form.headline,
        bio: form.bio,
        experience: form.experience,
        certifications: form.certifications,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    // 3. 스킬 저장
    for (const skill of selectedSkills) {
      await api.post(
        `/skills/me`,
        { skill_id: skill.id, level: skill.level },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    // ✅ 4. 튜토리얼 완료 API 호출 추가!
    await api.patch("/auth/tutorial-complete", {}, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ 튜토리얼 완료 처리됨");
    alert("프로필 설정이 완료되었습니다! 🎉");
    navigate("/");
  } catch (error) {
    console.error("프로필 저장 실패:", error);
    alert("프로필 저장 중 오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
};

  const StarRating = ({ level, onSelect }) => (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3].map((i) => (
        <img
          key={i}
          src={i <= level ? oneStarUrl : zeroStarUrl}
          alt={i <= level ? "filled" : "empty"}
          style={{
            width: "20px",
            height: "20px",
            cursor: onSelect ? "pointer" : "default",
          }}
          onClick={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Progress Bar - 상단 고정 */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
              {currentStep + 1} / {totalSteps}
            </span>
            <span style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #667eea, #764ba2)", transition: "width 0.3s ease" }} />
          </div>
        </div>
      </div>

      {/* Main Content - 중앙 */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: "800px" }}>

          {/* Step 0: 환영 화면 */}
          {currentStep === 0 && (
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "24px", color: "#1f2937" }}>
                환영합니다! 👋
              </h1>
              <p style={{ fontSize: "20px", color: "#6b7280", marginBottom: "40px", lineHeight: "1.6" }}>
                프로필을 완성하고<br />
                함께 프로젝트를 진행할 팀원을 찾아보세요!
              </p>
              <div style={{ fontSize: "80px", marginBottom: "40px" }}>💻</div>
              <p style={{ fontSize: "16px", color: "#9ca3af" }}>
                7단계로 프로필을 완성해요
              </p>
            </div>
          )}

          {/* Step 1: 프로필 이미지 */}
          {currentStep === 1 && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
                프로필 사진을 선택해주세요
              </h2>
              <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "40px" }}>
                {previewImage ? "멋진 프로필이네요! 😊" : "현재 프로필은 기본 프로필입니다"}
              </p>
              <div style={{ marginBottom: "32px" }}>
                <img
                  src={previewImage || "http://localhost:8000/assets/profile/default_profile.png"}
                  alt="프로필"
                  style={{
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    margin: "0 auto",
                    border: "4px solid #e5e7eb",
                  }}
                />
              </div>
              <label style={{
                display: "inline-block",
                padding: "16px 32px",
                background: "#667eea",
                color: "#fff",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}>
                사진 선택
                <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
              </label>
            </div>
          )}

          {/* Step 2: 헤드라인 */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
                한 줄로 자신을 소개해주세요
              </h2>
              <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "40px" }}>
                어떤 개발자인가요?
              </p>
              <input
                type="text"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="예: 풀스택 개발자 | React & Node.js"
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "18px",
                  outline: "none",
                }}
                onFocus={(e) => e.target.style.border = "2px solid #667eea"}
                onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
              />
            </div>
          )}

          {/* Step 3: 자기소개 */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
                자기소개를 작성해주세요
              </h2>
              <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "40px" }}>
                자신에 대해 자유롭게 표현해보세요
              </p>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="예: 3년차 프론트엔드 개발자입니다. React와 TypeScript를 주로 사용하며, 사용자 경험을 중요하게 생각합니다."
                rows={8}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "16px",
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.6",
                }}
                onFocus={(e) => e.target.style.border = "2px solid #667eea"}
                onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
              />
            </div>
          )}

          {/* Step 4: 이력 */}
          {currentStep === 4 && (
            <div>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
                경력 및 이력을 작성해주세요
              </h2>
              <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "40px" }}>
                프로젝트 경험이나 학력을 자유롭게 작성하세요
              </p>
              <textarea
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                placeholder="예:&#10;• 2022-2024: ABC 회사 프론트엔드 개발자&#10;• 2020-2022: XYZ 대학교 컴퓨터공학과 졸업"
                rows={8}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "16px",
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.6",
                }}
                onFocus={(e) => e.target.style.border = "2px solid #667eea"}
                onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
              />
            </div>
          )}

          {/* Step 5: 자격증 */}
          {currentStep === 5 && (
            <div>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
                자격증을 작성해주세요
              </h2>
              <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "40px" }}>
                보유하신 자격증이 있다면 작성해주세요
              </p>
              <textarea
                value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                placeholder="예:&#10;• 정보처리기사 (2023)&#10;• AWS Certified Solutions Architect (2024)"
                rows={8}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "16px",
                  resize: "none",
                  outline: "none",
                  lineHeight: "1.6",
                }}
                onFocus={(e) => e.target.style.border = "2px solid #667eea"}
                onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
              />
            </div>
          )}

          {/* Step 6: 스킬 */}
          {currentStep === 6 && (
            <div>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
                보유 스킬을 선택해주세요
              </h2>
              <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "32px" }}>
                자유롭게 선택해보세요 ({selectedSkills.length}개 선택됨)
              </p>

              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                padding: "24px",
                border: "2px dashed #e5e7eb",
                borderRadius: "12px",
                minHeight: "120px",
                marginBottom: "24px",
              }}>
                {selectedSkills.length > 0 ? (
                  selectedSkills.map((skill) => (
                    <div key={skill.id} style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "70px",
                      position: "relative",
                    }}>
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          right: "-8px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          fontSize: "16px",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                      <img
                        src={resolveSkillIconUrl(skill.name)}
                        alt={skill.name}
                        style={{ width: "48px", height: "48px", objectFit: "contain" }}
                      />
                      <span style={{ fontSize: "11px", marginTop: "4px", textAlign: "center", fontWeight: "500" }}>
                        {skill.name}
                      </span>
                      <StarRating level={skill.level} onSelect={(lv) => handleUpdateSkillLevel(skill.id, lv)} />
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#9ca3af", fontSize: "16px", margin: "auto" }}>
                    아래에서 스킬을 검색하고 추가해보세요
                  </p>
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="스킬 검색 (예: React, Python, Java)"
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "16px",
                  outline: "none",
                }}
              />

              {searchResults.length > 0 && (
                <div style={{
                  marginTop: "16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  maxHeight: "240px",
                  overflowY: "auto",
                }}>
                  {searchResults.map((skill) => (
                    <div key={skill.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderBottom: "1px solid #f3f4f6",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img
                          src={resolveSkillIconUrl(skill.name)}
                          alt={skill.name}
                          style={{ width: "32px", height: "32px", objectFit: "contain" }}
                        />
                        <span style={{ fontSize: "16px", fontWeight: "500" }}>{skill.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {[1, 2, 3].map((star) => (
                          <img
                            key={star}
                            src={zeroStarUrl}
                            alt="star"
                            style={{ width: "24px", height: "24px", cursor: "pointer" }}
                            onClick={() => handleAddSkill(skill, star)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Navigation Buttons - 하단 고정 */}
      <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "20px 40px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "16px" }}>
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: "16px",
                background: "#fff",
                color: "#374151",
                border: "2px solid #e5e7eb",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              이전
            </button>
          )}
          {currentStep < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                padding: "16px",
                background: "linear-gradient(90deg, #667eea, #764ba2)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {getButtonText()}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              style={{
                flex: 1,
                padding: "16px",
                background: loading ? "#d1d5db" : "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "저장 중..." : "완료! 🎉"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}