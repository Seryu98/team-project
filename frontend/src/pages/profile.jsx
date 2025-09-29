import { useEffect, useState } from "react";
import api from "../services/api";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/profiles/1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        setForm(res.data);
      } catch (err) {
        alert("프로필 불러오기 실패");
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.put("/profiles/1", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("프로필 수정 완료!");
      setEditMode(false);
      setProfile(form);
    } catch (err) {
      alert("수정 실패");
    }
  };

  if (!profile) return <p>로딩중...</p>;

  return (
    <div>
      {!editMode ? (
        <>
          <h2>{profile.nickname}님의 프로필</h2>
          <p>한줄소개: {profile.short_intro}</p>
          <p>자기소개: {profile.bio}</p>
          <p>경력: {profile.career}</p>
          <p>자격증: {profile.certificates}</p>
          <p>생년월일: {profile.birthdate}</p>
          <p>성별: {profile.gender}</p>
          <p>
            보유 스킬:{" "}
            {profile.skills?.length > 0
              ? profile.skills.map((s) => (
                  <span key={s.name} style={{ marginRight: "10px" }}>
                    <img
                      src={`/src/assets/skills/${s.name}.png`}
                      alt={s.name}
                      style={{ width: "20px", height: "20px" }}
                    />{" "}
                    {s.name} ⭐{s.level}
                  </span>
                ))
              : "없음"}
          </p>
          <button onClick={() => setEditMode(true)}>프로필 수정</button>
        </>
      ) : (
        <>
          <input name="nickname" value={form.nickname} onChange={handleChange} />
          <input name="short_intro" value={form.short_intro} onChange={handleChange} />
          <textarea name="bio" value={form.bio} onChange={handleChange} />
          <input name="career" value={form.career} onChange={handleChange} />
          <input name="certificates" value={form.certificates} onChange={handleChange} />
          <input type="date" name="birthdate" value={form.birthdate} onChange={handleChange} />

          <div>
            <label>
              <input type="radio" name="gender" value="남성" checked={form.gender === "남성"} onChange={handleChange}/> 남성
            </label>
            <label>
              <input type="radio" name="gender" value="여성" checked={form.gender === "여성"} onChange={handleChange}/> 여성
            </label>
            <label>
              <input type="radio" name="gender" value="비공개" checked={form.gender === "비공개"} onChange={handleChange}/> 비공개
            </label>
          </div>

          <button onClick={handleSave}>저장</button>
          <button onClick={() => setEditMode(false)}>취소</button>
        </>
      )}
    </div>
  );
}
