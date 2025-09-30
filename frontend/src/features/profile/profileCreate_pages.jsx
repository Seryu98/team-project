// src/features/profile/ProfileCreate.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

/** Vite 정적 에셋 맵 */
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

  // 이미지 미리보기 (선택 직후 보여주고, 업로드 성공 후 서버 경로로 교체)
  const [previewImage, setPreviewImage] = useState(null);

  // 스킬 검색 상태
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

  // ✅ 스킬 아이콘 파일명 보정 (DB 표기 ↔ 파일명 차이 흡수)
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
      // ⬇⬇ 여기 핵심: toLowerCase 했으니 키도 소문자여야 함!
      objectivec: "objective",
      "objective-c": "objective",
      "objective c": "objective",
      "postgre_sql": "postgresql",
      "ms_sql_server": "mssqlserver",
    };
    norm = aliases[norm] || norm;

    if (SKILL_ICONS[norm]) return SKILL_ICONS[norm];
    // 마지막 안전장치 (public 경로)
    return `/assets/skills/${rawName.replace(/\s+/g, "_")}.png`;
  };

  // ✅ 내 프로필 불러오기
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
      // 서버에 저장된 기존 이미지가 있으면 기본 프리뷰로 세팅
      setPreviewImage(res.data.profile_image || null);
    } catch {
      alert("내 프로필 불러오기 실패");
    }
  };

  useEffect(() => {
    fetchMyProfile();
  }, []);

  // ✅ 입력 변경
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ 프로필 저장 (저장 후 내 프로필로 이동)
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.put("/profiles/me", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const meRes = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("프로필이 저장되었습니다.");
      navigate(`/profile/${meRes.data.id}`);
    } catch {
      alert("프로필 저장 실패");
    }
  };

  // ✅ 프로필 이미지 업로드(선택 즉시 미리보기 → 업로드 성공 시 서버 경로로 교체)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1) 로컬 미리보기 먼저 보여줌
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

      // 2) 서버 응답의 이미지 URL로 즉시 교체 (깜빡임/사라짐 방지)
      setProfile(res.data);
      if (res.data?.profile_image) setPreviewImage(res.data.profile_image);

      // 3) 로컬 URL 해제 (메모리 누수 방지)
      URL.revokeObjectURL(localUrl);
    } catch {
      alert("이미지 업로드 실패");
    }
  };

  // ✅ 스킬 검색
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
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

  // ✅ 스킬 추가
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

  // ✅ 스킬 삭제
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

  // ✅ 스킬 숙련도 수정
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

  if (!profile) return <div className="text-center mt-10">로딩 중...</div>;

  // ⭐ 별(3점) 표시/수정 — 20px
  const StarRating = ({ level, onSelect }) => (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <img
          key={i}
          src={i <= level ? oneStarUrl : zeroStarUrl}
          alt={i <= level ? "onestar" : "zerostar"}
          className={`w-5 h-5 ${onSelect ? "cursor-pointer" : ""} ${loading ? "opacity-50 pointer-events-none" : ""
            }`}
          onClick={onSelect ? () => onSelect(i) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="flex justify-center mt-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-2xl">
        {/* 프로필 이미지 */}
        <div className="flex items-center gap-6">
          <img
            src={
              previewImage
                ? previewImage
                : profile?.profile_image
                  ? `http://localhost:8000${profile.profile_image}`
                  : "/assets/default_profile.png"
            }
            alt="프로필 이미지"
            className="w-24 h-24 rounded-full border object-cover"
          />
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>

        {/* 프로필 수정 폼 */}
        <div className="mt-6 space-y-4">
          <textarea
            name="bio"
            value={form.bio || ""}
            onChange={handleChange}
            placeholder="자기소개"
            rows={6}
            className="border p-3 w-full rounded resize-none"
          />
          <input
            type="text"
            name="experience"
            value={form.experience || ""}
            onChange={handleChange}
            placeholder="경력"
            className="border p-2 w-full rounded"
          />
          <input
            type="text"
            name="certifications"
            value={form.certifications || ""}
            onChange={handleChange}
            placeholder="자격증"
            className="border p-2 w-full rounded"
          />
          <input
            type="date"
            name="birth_date"
            value={form.birth_date || ""}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
          <select
            name="gender"
            value={form.gender || ""}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          >
            <option value="">성별 선택</option>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
        </div>

        {/* 내 보유 스킬 */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">내 보유 스킬</h3>
          <div className="space-y-2">
            {(profile.skills || []).map((skill) => (
              <div key={skill.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <img src={resolveSkillIconUrl(skill.name)} alt={skill.name} className="w-5 h-5" />
                  <span className="text-sm">{skill.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StarRating level={skill.level} onSelect={(lv) => handleUpdateSkillLevel(skill.id, lv)} />
                  <button onClick={() => handleDeleteSkill(skill.id)} className="text-red-500 text-sm">삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 새 스킬 추가 */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">스킬 추가하기</h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="스킬 검색 (예: React Native, C#, C++)"
            className="border p-2 rounded w-full"
          />

          {searchResults.length > 0 && (
            <div className="mt-4 border rounded p-3 space-y-2 bg-gray-50">
              {searchResults.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <img src={resolveSkillIconUrl(skill.name)} alt={skill.name} className="w-5 h-5" />
                    <span className="text-sm">{skill.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((star) => (
                      <img
                        key={star}
                        src={zeroStarUrl}
                        alt="select-star"
                        className="w-5 h-5 cursor-pointer"
                        onClick={() => handleAddSkill(skill.id, star)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 저장 버튼 - 맨 아래 */}
        <button onClick={handleSave} className="mt-6 w-full bg-green-500 text-white py-2 rounded">
          저장
        </button>
      </div>
    </div>
  );
}
