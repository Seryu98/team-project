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
    nickname: "",
    headline: "",
    bio: "",
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

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

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

  const canProceed = () => {
    if (currentStep === 0) return true; // 환영 화면
    if (currentStep === 1) return previewImage; // 프로필 이미지
    if (currentStep === 2) return form.nickname && form.headline; // 닉네임 + 헤드라인
    if (currentStep === 3) return form.bio; // 자기소개
    if (currentStep === 4) return selectedSkills.length >= 3; // 스킬 3개 이상
    return false;
  };

  const handleNext = () => {
    if (canProceed() && currentStep < totalSteps - 1) {
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
          nickname: form.nickname,
          headline: form.headline,
          bio: form.bio,
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

      alert("프로필 설정이 완료되었습니다! 🎉");
      navigate("/"); // 메인 페이지로 이동
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "#fff", borderRadius: "16px", padding: "40px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: "32px" }}>
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

        {/* Step 0: 환영 화면 */}
        {currentStep === 0 && (
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "16px", color: "#1f2937" }}>
              환영합니다! 👋
            </h1>
            <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "32px", lineHeight: "1.6" }}>
              프로필을 완성하고<br />
              함께 프로젝트를 진행할 팀원을 찾아보세요!
            </p>
            <div style={{ fontSize: "64px", marginBottom: "32px" }}>🚀</div>
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>
              5단계만 완료하면 프로필이 완성돼요
            </p>
          </div>
        )}

        {/* Step 1: 프로필 이미지 */}
        {currentStep === 1 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px", color: "#1f2937" }}>
              프로필 사진을 선택해주세요
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "32px" }}>
              첫인상이 중요해요! 😊
            </p>
            <div style={{ marginBottom: "24px" }}>
              <img
                src={
                  previewImage ||
                  "http://localhost:8000/assets/profile/default_profile.png"
                }
                alt="프로필"
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  margin: "0 auto",
                  border: "4px solid #e5e7eb",
                }}
              />
            </div>
            <label style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "#3b82f6",
              color: "#fff",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}>
              사진 선택
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {/* Step 2: 닉네임 + 헤드라인 */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px", color: "#1f2937" }}>
              자신을 소개해주세요
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "32px" }}>
              어떻게 불리고 싶으신가요?
            </p>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#374151" }}>
                닉네임
              </label>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="예: 코딩천재"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border 0.2s",
                }}
                onFocus={(e) => e.target.style.border = "2px solid #667eea"}
                onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px", color: "#374151" }}>
                한 줄 소개
              </label>
              <input
                type="text"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="예: 풀스택 개발자 | React & Node.js"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border 0.2s",
                }}
                onFocus={(e) => e.target.style.border = "2px solid #667eea"}
                onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
              />
            </div>
          </div>
        )}

        {/* Step 3: 자기소개 */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px", color: "#1f2937" }}>
              자신에 대해 알려주세요
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "32px" }}>
              어떤 개발자인지 자유롭게 작성해보세요
            </p>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="예: 3년차 프론트엔드 개발자입니다. React와 TypeScript를 주로 사용하며, 사용자 경험을 중요하게 생각합니다."
              rows={8}
              style={{
                width: "100%",
                padding: "16px",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                resize: "none",
                outline: "none",
                lineHeight: "1.6",
                transition: "border 0.2s",
              }}
              onFocus={(e) => e.target.style.border = "2px solid #667eea"}
              onBlur={(e) => e.target.style.border = "2px solid #e5e7eb"}
            />
          </div>
        )}

        {/* Step 4: 스킬 선택 */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "12px", color: "#1f2937" }}>
              보유 스킬을 선택해주세요
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
              최소 3개 이상 선택해주세요 ({selectedSkills.length}/3)
            </p>

            {/* 선택된 스킬 */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              padding: "16px",
              border: "2px dashed #e5e7eb",
              borderRadius: "8px",
              minHeight: "100px",
              marginBottom: "20px",
            }}>
              {selectedSkills.length > 0 ? (
                selectedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: "70px",
                      position: "relative",
                    }}
                  >
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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
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
                    <StarRating
                      level={skill.level}
                      onSelect={(lv) => handleUpdateSkillLevel(skill.id, lv)}
                    />
                  </div>
                ))
              ) : (
                <p style={{ color: "#9ca3af", fontSize: "14px", margin: "auto" }}>
                  아래에서 스킬을 검색하고 추가해보세요
                </p>
              )}
            </div>

            {/* 스킬 검색 */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="스킬 검색 (예: React, Python, Java)"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />

              {searchResults.length > 0 && (
                <div style={{
                  marginTop: "12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}>
                  {searchResults.map((skill) => (
                    <div
                      key={skill.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #f3f4f6",
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img
                          src={resolveSkillIconUrl(skill.name)}
                          alt={skill.name}
                          style={{ width: "32px", height: "32px", objectFit: "contain" }}
                        />
                        <span style={{ fontSize: "14px", fontWeight: "500" }}>{skill.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {[1, 2, 3].map((star) => (
                          <img
                            key={star}
                            src={zeroStarUrl}
                            alt="star"
                            style={{
                              width: "24px",
                              height: "24px",
                              cursor: "pointer",
                            }}
                            onClick={() => handleAddSkill(skill, star)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: "14px",
                background: "#fff",
                color: "#374151",
                border: "2px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              이전
            </button>
          )}
          {currentStep < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                flex: 1,
                padding: "14px",
                background: canProceed() ? "linear-gradient(90deg, #667eea, #764ba2)" : "#d1d5db",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "500",
                cursor: canProceed() ? "pointer" : "not-allowed",
              }}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
              style={{
                flex: 1,
                padding: "14px",
                background: canProceed() && !loading ? "linear-gradient(90deg, #10b981, #059669)" : "#d1d5db",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "500",
                cursor: canProceed() && !loading ? "pointer" : "not-allowed",
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