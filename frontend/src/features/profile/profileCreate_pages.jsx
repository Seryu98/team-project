// src/features/profile/ProfileCreate.jsx
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

export default function ProfileCreate() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

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

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const meRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await api.get(`/profiles/${meRes.data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setForm(res.data);
      setPreviewImage(res.data.profile_image || null);
    } catch {
      alert("내 프로필 불러오기 실패");
    }
  };

  useEffect(() => {
    fetchMyProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");

      // ✅ nickname 포함해서 전송
      const updateData = {
        nickname: form.nickname || "",
        headline: form.headline || "",
        bio: form.bio || "",
        experience: form.experience || "",
        certifications: form.certifications || "",
        birth_date: form.birth_date || null,
        gender: form.gender || null,
      };

      await api.put("/profiles/me", updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const meRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("프로필이 저장되었습니다.");
      navigate(`/profile/${meRes.data.id}`);
    } catch (error) {
      console.error("저장 실패:", error.response?.data);
      alert("프로필 저장 실패");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewImage(localUrl);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const res = await api.post("/profiles/me/image", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile(res.data);
      if (res.data?.profile_image) setPreviewImage(res.data.profile_image);
    } catch {
      alert("이미지 업로드 실패");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
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
        (s) => !(profile?.skills || []).some((my) => my.id === s.id)
      );
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddSkill = async (skillId, level) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await api.post(
        `/skills/me`,
        { skill_id: skillId, level },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile((prev) => ({
        ...prev,
        skills: [...(prev?.skills || []), res.data],
      }));
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      alert("스킬 추가 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.delete(`/skills/me/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile((prev) => ({
        ...prev,
        skills: (prev?.skills || []).filter((s) => s.id !== skillId),
      }));
    } catch {
      alert("스킬 삭제 실패");
    }
  };

  const handleUpdateSkillLevel = async (skillId, newLevel) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await api.put(
        `/skills/me/${skillId}`,
        { skill_id: skillId, level: newLevel },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile((prev) => ({
        ...prev,
        skills: (prev?.skills || []).map((s) => (s.id === skillId ? res.data : s)),
      }));
    } catch {
      alert("스킬 수정 실패");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: "40px" }}>로딩 중...</div>;

  const StarRating = ({ level, onSelect }) => (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3].map((i) => (
        <img
          key={i}
          src={i <= level ? oneStarUrl : zeroStarUrl}
          alt={i <= level ? "onestar" : "zerostar"}
          style={{
            width: "20px",
            height: "20px",
            cursor: onSelect ? "pointer" : "default",
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto"
          }}
          onClick={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "24px", fontWeight: "bold", textAlign: "center", marginBottom: "40px" }}>
          프로필 수정
        </h1>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "30px" }}>
          <div style={{ position: "relative" }}>
            <img
              src={
                previewImage
                  ? previewImage
                  : profile?.profile_image
                    ? `http://localhost:8000${profile.profile_image}`
                    : "/assets/default_profile.png"
              }
              alt="프로필 이미지"
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                objectFit: "cover",
                background: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <input
              type="text"
              name="nickname"
              value={form.nickname || ""}
              onChange={handleChange}
              placeholder="닉네임"
              style={{
                width: "100%",
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "8px",
                padding: "4px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
            <input
              type="text"
              name="headline"
              value={form.headline || ""}
              onChange={handleChange}
              placeholder="한 줄 자기소개"
              style={{
                width: "100%",
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "12px",
                padding: "4px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{
                fontSize: "13px",
                padding: "4px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            생년월일
          </label>
          <input
            type="date"
            name="birth_date"
            value={form.birth_date || ""}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              background: "#fafafa",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            성별
          </label>
          <select
            name="gender"
            value={form.gender || ""}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              background: "#fafafa",
            }}
          >
            <option value="">성별 선택</option>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자기소개
          </label>
          <textarea
            name="bio"
            value={form.bio || ""}
            onChange={handleChange}
            placeholder="자기소개를 입력하세요"
            rows={6}
            style={{
              width: "100%",
              padding: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "none",
              background: "#fafafa",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            이력
          </label>
          <textarea
            name="experience"
            value={form.experience || ""}
            onChange={handleChange}
            placeholder="경력을 입력하세요"
            rows={6}
            style={{
              width: "100%",
              padding: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "none",
              background: "#fafafa",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자격증
          </label>
          <textarea
            name="certifications"
            value={form.certifications || ""}
            onChange={handleChange}
            placeholder="자격증을 입력하세요"
            rows={6}
            style={{
              width: "100%",
              padding: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              resize: "none",
              background: "#fafafa",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            사용 가능한 언어
          </label>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            minHeight: "100px",
            background: "#fafafa",
            marginBottom: "12px"
          }}>
            {(profile.skills || []).length > 0 ? (
              (profile.skills || []).map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "60px",
                    position: "relative"
                  }}
                >
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    ×
                  </button>
                  <img
                    src={resolveSkillIconUrl(skill.name)}
                    alt={skill.name}
                    style={{ width: "40px", height: "40px", objectFit: "contain" }}
                  />
                  <span style={{ fontSize: "11px", marginTop: "4px", textAlign: "center" }}>
                    {skill.name}
                  </span>
                  <StarRating
                    level={skill.level}
                    onSelect={(lv) => handleUpdateSkillLevel(skill.id, lv)}
                  />
                </div>
              ))
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "13px", margin: "auto" }}>등록된 스킬이 없습니다</p>
            )}
          </div>

          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="스킬 검색 (예: React, Python, C++)"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#fff",
              }}
            />

            {searchResults.length > 0 && (
              <div style={{
                marginTop: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "12px",
                background: "#f9fafb"
              }}>
                {searchResults.map((skill) => (
                  <div
                    key={skill.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <img
                        src={resolveSkillIconUrl(skill.name)}
                        alt={skill.name}
                        style={{ width: "24px", height: "24px", objectFit: "contain" }}
                      />
                      <span style={{ fontSize: "13px" }}>{skill.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[1, 2, 3].map((star) => (
                        <img
                          key={star}
                          src={zeroStarUrl}
                          alt="select-star"
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: "pointer",
                            opacity: loading ? 0.5 : 1,
                          }}
                          onClick={() => !loading && handleAddSkill(skill.id, star)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "14px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          저장
        </button>
      </div>
    </div>
  );
}