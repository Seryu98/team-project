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
  const [headline, setHeadline] = useState(""); // 한 줄 자기소개

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
      "c#": "csharp",
      "c++": "cplus",
      objectivec: "objective",
    };
    norm = aliases[norm] || norm;
    if (SKILL_ICONS[norm]) return SKILL_ICONS[norm];
    return `/assets/skills/${rawName.replace(/\s+/g, "_")}.png`;
  };

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const meRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await api.get(`/profiles/${meRes.data.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setForm(res.data);
      setHeadline(res.data.headline || ""); // 한 줄 자기소개 로드
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
    const token = localStorage.getItem("token");

    const updatedForm = { ...form, headline };

    await api.put("/profiles/me", updatedForm, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const meRes = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    alert("프로필이 저장되었습니다.");
    navigate(`/profile/${meRes.data.id}`, { replace: true });  // ✅ replace로 이동
    window.location.reload();  // ✅ 강제 새로고침
  } catch {
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
      const token = localStorage.getItem("token");
      const res = await api.post("/profiles/me/image", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfile(res.data);
      if (res.data?.profile_image) setPreviewImage(res.data.profile_image);
      URL.revokeObjectURL(localUrl);
      alert("프로필 이미지가 변경되었습니다.");
    } catch {
      alert("이미지 업로드 실패");
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/skills/search?q=${query.trim()}&limit=10`, {
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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* 헤더 */}
        <h1 style={{ fontSize: "24px", fontWeight: "bold", textAlign: "center", marginBottom: "40px" }}>
          프로필 수정
        </h1>

        {/* 프로필 영역 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "30px" }}>
          <div style={{ position: "relative" }}>
            <img
              src={
                previewImage
                  ? previewImage.startsWith("blob:")
                    ? previewImage
                    : `http://localhost:8000${previewImage}`
                  : "/assets/default_profile.png"
              }
              alt="프로필"
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                objectFit: "cover",
                background: "#e5e7eb",
              }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              id="profile-upload"
            />
          </div>

          <div style={{ flex: 1 }}>
            {/* 닉네임 수정 가능 */}
            <input
              type="text"
              name="nickname"
              value={form.nickname || ""}
              onChange={handleChange}
              placeholder="닉네임을 입력하세요"
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "4px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                padding: "4px 8px",
                width: "100%",
              }}
            />


            {/* 한 줄 자기소개 입력 필드 */}
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="한 줄 자기소개를 입력하세요"
              style={{
                width: "100%",
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "12px",
                padding: "4px 8px",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
              }}
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <label
                htmlFor="profile-upload"
                style={{
                  padding: "6px 16px",
                  fontSize: "13px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "inline-block",
                }}
              >
                프로필 수정
              </label>
              <button
                onClick={handleSave}
                style={{
                  padding: "6px 16px",
                  fontSize: "13px",
                  border: "none",
                  background: "#000",
                  color: "#fff",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                변경사항 저장
              </button>
            </div>
          </div>
        </div>

        {/* 성별 */}
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
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontFamily: "inherit",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="">선택하지 않음</option>
            <option value="MALE">남자</option>
            <option value="FEMALE">여자</option>
            <option value="PRIVATE">비공개</option>
          </select>
        </div>

        {/* 생년월일 */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            생년월일
          </label>
          <input
            type="date"
            name="birth_date"
            value={form.birth_date || ""}
            onChange={handleChange}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          />
        </div>

        {/* 자기소개 */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자기소개
          </label>
          <textarea
            name="bio"
            value={form.bio || ""}
            onChange={handleChange}
            placeholder="Write a brief introduction about yourself..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* 어학 */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            어학
          </label>
          <textarea
            name="experience"
            value={form.experience || ""}
            onChange={handleChange}
            placeholder="Write a brief introduction about yourself..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* 자격증 */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자격증
          </label>
          <textarea
            name="certifications"
            value={form.certifications || ""}
            onChange={handleChange}
            placeholder="Write a brief introduction about yourself..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* 사용 가능한 언어 */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            사용 가능한 언어
          </label>

          {/* 스킬 가로 배치 */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            minHeight: "100px",
            background: "#fafafa"
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
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
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
                  <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                    {[1, 2, 3].map((i) => (
                      <img
                        key={i}
                        src={i <= skill.level ? oneStarUrl : zeroStarUrl}
                        alt="star"
                        style={{ width: "10px", height: "10px", cursor: "pointer" }}
                        onClick={() => handleUpdateSkillLevel(skill.id, i)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>등록된 스킬이 없습니다</p>
            )}
          </div>

          {/* 스킬 검색 */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="스킬 검색 (예: Java, Python, React...)"
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "10px",
              fontSize: "13px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          />

          {searchResults.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "12px",
                background: "#f9fafb",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <img
                      src={resolveSkillIconUrl(skill.name)}
                      alt={skill.name}
                      style={{ width: "24px", height: "24px" }}
                    />
                    <span style={{ fontSize: "13px" }}>{skill.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[1, 2, 3].map((star) => (
                      <img
                        key={star}
                        src={zeroStarUrl}
                        alt="add"
                        style={{ width: "14px", height: "14px", cursor: "pointer" }}
                        onClick={() => handleAddSkill(skill.id, star)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 전문용어 프로젝트 */}
        <div style={{ marginBottom: "40px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            전문용어 프로젝트
          </label>
          <textarea
            placeholder="Write a brief introduction about yourself..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>
    </div>
  );
}