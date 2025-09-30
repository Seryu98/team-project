import { useEffect, useState } from "react";
import api from "./api";
export default function ProfileCreate() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  // 스킬 관련
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // ✅ 프로필 불러오기 (내 프로필)
  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/profiles/1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setForm(res.data);
    } catch (err) {
      alert("내 프로필 불러오기 실패");
    }
  };

  useEffect(() => {
    fetchMyProfile();
  }, []);

  // ✅ 입력 변경 핸들러
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ 프로필 저장
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.put("/profiles/me", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("프로필이 저장되었습니다.");
      fetchMyProfile();
    } catch (err) {
      alert("프로필 저장 실패");
    }
  };

  // ✅ 프로필 이미지 업로드
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
      alert("이미지가 업로드되었습니다.");
    } catch (err) {
      alert("이미지 업로드 실패");
    }
  };

  // ✅ 스킬 검색
  const handleSearch = async () => {
    try {
      const token = localStorage.getItem("token");
      const normalizedQuery = searchQuery.trim().replace(/\s+/g, "_");
      const res = await api.get(`/skills/search?q=${normalizedQuery}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSearchResults(res.data);
    } catch (err) {
      alert("스킬 검색 실패");
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
        skills: [...prev.skills, res.data],
      }));
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      alert("스킬 추가 실패 (이미 등록된 스킬일 수 있음)");
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
        skills: prev.skills.filter((s) => s.id !== skillId),
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
        skills: prev.skills.map((s) =>
          s.id === skillId ? res.data : s
        ),
      }));
    } catch {
      alert("스킬 수정 실패");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div className="text-center mt-10">로딩 중...</div>;

  const getIconPath = (name) =>
    `/assets/skills/${name
      .toLowerCase()
      .replace(/\+/g, "plus")
      .replace(/#/g, "sharp")}.png`;

  return (
    <div className="flex justify-center mt-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-2xl">
        {/* 프로필 이미지 */}
        <div className="flex items-center gap-6">
          <img
            src={profile.profile_image || "/assets/default_profile.png"}
            alt="프로필 이미지"
            className="w-24 h-24 rounded-full border object-cover"
          />
          <input type="file" onChange={handleImageUpload} />
        </div>

        {/* 프로필 수정 폼 */}
        <div className="mt-6 space-y-4">
          <input
            type="text"
            name="bio"
            value={form.bio || ""}
            onChange={handleChange}
            placeholder="자기소개"
            className="border p-2 w-full rounded"
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

        <button
          onClick={handleSave}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
        >
          저장
        </button>

        {/* 스킬 목록 수정/삭제/숙련도 변경 */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">내 보유 스킬</h3>
          <div className="space-y-2">
            {profile.skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={getIconPath(skill.name)}
                    alt={skill.name}
                    className="w-6 h-6"
                  />
                  <span>{skill.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* 별점 수정 */}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((star) => (
                      <img
                        key={star}
                        src={
                          star <= skill.level
                            ? "/assets/star/star_filled.png"
                            : "/assets/star/star_empty.png"
                        }
                        alt="별점"
                        className={`w-5 h-5 cursor-pointer ${
                          loading ? "opacity-50 pointer-events-none" : ""
                        }`}
                        onClick={() => handleUpdateSkillLevel(skill.id, star)}
                      />
                    ))}
                  </div>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="text-red-500"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 새 스킬 추가 */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">스킬 추가하기</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="스킬 검색 (예: React Native)"
              className="border p-2 rounded w-full"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              검색
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 border rounded p-3 space-y-2">
              {searchResults.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={getIconPath(skill.name)}
                      alt={skill.name}
                      className="w-6 h-6"
                    />
                    <span>{skill.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((star) => (
                      <img
                        key={star}
                        src="/assets/star/star_empty.png"
                        alt="별점"
                        className={`w-5 h-5 cursor-pointer ${
                          loading ? "opacity-50 pointer-events-none" : ""
                        }`}
                        onClick={() => handleAddSkill(skill.id, star)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
