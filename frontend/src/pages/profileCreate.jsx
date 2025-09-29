import { useState } from "react";
import api from "../services/api";

// 로컬 skills 배열 (모두 소문자로 저장)
const allSkills = [
  "bash","c","c#","c++","clojure","css","dart","django","elixir","erlang","expressjs",
  "f#","flask","flutter","go","groovy","haskell","html","java","javascript","json","julia",
  "kotlin","laravel","less","lisp","lua","markdown","matlab","mongodb","mssqlserver","mysql",
  "nodejs","objective","ocaml","oracle","perl","php","postgresql","powershell","python","r",
  "react_native","redis","ruby","rust","sass","scala","scheme","spring","spss","sqlite","swift",
  "typescript","zig"
];

export default function ProfileCreate() {
  const [form, setForm] = useState({
    nickname: "",
    short_intro: "",
    bio: "",
    career: "",
    certificates: "",
    birthdate: "",
    gender: "비공개",
    skills: []
  });

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 스킬 검색 (소문자 변환)
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    if (value.length < 1) {
      setSearchResults([]);
      return;
    }
    const results = allSkills.filter(skill =>
      skill.toLowerCase().includes(value)
    );
    setSearchResults(results.map((s, idx) => ({ id: idx, name: s })));
  };

  // 스킬 추가
  const addSkill = (skill) => {
    if (!form.skills.find((s) => s.name === skill.name)) {
      setForm({ ...form, skills: [...form.skills, { ...skill, level: 1 }] });
    }
    setSearch("");
    setSearchResults([]);
  };

  // 별점 변경
  const changeSkillLevel = (id, level) => {
    if (level < 1) level = 1;
    if (level > 3) level = 3;
    setForm({
      ...form,
      skills: form.skills.map((s) =>
        s.id === id ? { ...s, level } : s
      ),
    });
  };

  const removeSkill = (id) => {
    setForm({
      ...form,
      skills: form.skills.filter((s) => s.id !== id),
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.post("/profiles", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("프로필 생성 완료!");
      window.location.href = "/profile";
    } catch (err) {
      alert("프로필 저장 실패: " + err.response?.data?.detail);
    }
  };

  const handleSkip = () => {
    window.location.href = "/";
  };

  return (
    <div>
      <h2>프로필 생성</h2>

      <input name="nickname" placeholder="닉네임" value={form.nickname} onChange={handleChange} />
      <input name="short_intro" placeholder="한줄 자기소개" value={form.short_intro} onChange={handleChange} />
      <textarea name="bio" placeholder="자기소개" value={form.bio} onChange={handleChange} />
      <input name="career" placeholder="경력" value={form.career} onChange={handleChange} />
      <input name="certificates" placeholder="자격증" value={form.certificates} onChange={handleChange} />
      <input type="date" name="birthdate" value={form.birthdate} onChange={handleChange} />

      <div>
        <label><input type="radio" name="gender" value="남성" checked={form.gender === "남성"} onChange={handleChange}/> 남성</label>
        <label><input type="radio" name="gender" value="여성" checked={form.gender === "여성"} onChange={handleChange}/> 여성</label>
        <label><input type="radio" name="gender" value="비공개" checked={form.gender === "비공개"} onChange={handleChange}/> 비공개</label>
      </div>

      {/* 스킬 검색 */}
      <input type="text" placeholder="스킬 검색" value={search} onChange={handleSearch} />
      {searchResults.length > 0 && (
        <ul>
          {searchResults.map((skill) => (
            <li key={skill.id} onClick={() => addSkill(skill)}>
              <img
                src={`/src/assets/skills/${skill.name}.png`}
                alt={skill.name}
                style={{ width: "20px", height: "20px", marginRight: "8px" }}
              />
              {skill.name}
            </li>
          ))}
        </ul>
      )}

      {/* 선택된 스킬 */}
      <div>
        <h3>내 스킬</h3>
        {form.skills.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
            <img
              src={`/src/assets/skills/${s.name}.png`}
              alt={s.name}
              style={{ width: "30px", height: "30px", marginRight: "8px" }}
            />
            <span style={{ marginRight: "12px" }}>{s.name}</span>
            {[1, 2, 3].map((star) => (
              <img
                key={star}
                src={
                  s.level >= star
                    ? "/src/assets/star/onestar.png"
                    : "/src/assets/star/zerostar.png"
                }
                alt={s.level >= star ? "onestar" : "zerostar"}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
                onClick={() => changeSkillLevel(s.id, star)}
              />
            ))}
            <button onClick={() => removeSkill(s.id)}>삭제</button>
          </div>
        ))}
      </div>

      <button onClick={handleSave}>저장</button>
      <button onClick={handleSkip}>건너뛰기</button>
    </div>
  );
}
