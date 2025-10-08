// /src/features/project_post/ProjectPostList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api"; // ✅ 경로 맞게 수정

export default function ProjectPostList() {
  const [posts, setPosts] = useState([]);
  const [skills, setSkills] = useState([]);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: "ALL",              // 구분 (ALL, PROJECT, STUDY)
    status: "APPROVED",       // 관리자 승인 여부
    recruit_status: "OPEN",   // 모집 상태
    search: "",
    start_date: "",
    end_date: "",
    skill_ids: [],            // 사용 언어
    match_mode: "OR",         // OR 기본값, AND(정확 매칭) 옵션
    page: 1,
    page_size: 10,
  });

  // ✅ 게시판 목록 불러오기
  useEffect(() => {
    async function fetchPosts() {
      try {
        const queryParams = Object.fromEntries(
          Object.entries({
            ...filters,
            type: filters.type === "ALL" ? "" : filters.type,
          }).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
        );

        // ✅ skill_ids 빈 배열일 경우 제외
        if (Array.isArray(queryParams.skill_ids) && queryParams.skill_ids.length === 0) {
          delete queryParams.skill_ids;
        }

        // ✅ fetch용 query string 변환
        const searchParams = new URLSearchParams();
        Object.keys(queryParams).forEach((key) => {
          if (Array.isArray(queryParams[key])) {
            queryParams[key].forEach((val) => searchParams.append(key, val));
          } else {
            searchParams.append(key, queryParams[key]);
          }
        });

        const queryString = searchParams.toString();

        const res = await authFetch(`/recipe/list?${queryString}`, {
          method: "GET",
        });

        setPosts(res);
      } catch (err) {
        console.error("❌ 게시판 불러오기 실패:", err);
      }
    }
    fetchPosts();
  }, [filters]);

  // ✅ 스킬 목록 불러오기
  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await authFetch("/meta/skills", { method: "GET" });
        setSkills(res);
      } catch (err) {
        console.error("❌ 스킬 목록 불러오기 실패:", err);
      }
    }
    fetchSkills();
  }, []);

  // ✅ 구분 선택 시 → 언어/정확매칭 해제
  const handleTypeChange = (t) => {
    setFilters((prev) => ({
      ...prev,
      type: t,
      skill_ids: [],     // 언어 초기화
      match_mode: "OR",  // 정확매칭 초기화
    }));
  };

  // ✅ 언어 선택 시 
  const toggleSkill = (id) => {
    setFilters((prev) => {
      const already = prev.skill_ids.includes(id);
      return {
        ...prev,
        type: "ALL", 
        skill_ids: already
          ? prev.skill_ids.filter((s) => s !== id)
          : [...prev.skill_ids, id],
      };
    });
  };

  // ✅ 정확 매칭 시 
  const toggleMatchMode = (checked) => {
    setFilters((prev) => ({
      ...prev,
      type: "ALL",                 
      match_mode: checked ? "AND" : "OR",
    }));
  };

  // ✅ 모집 상태 (라디오)
  const toggleRecruitStatus = (status) => {
    setFilters((prev) => ({
      ...prev,
      recruit_status: status,
    }));
  };

  // ✅ 생성 버튼 클릭 시 로그인 체크
  const handleCreateClick = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("로그인 후 이용 가능합니다.");
      navigate("/login");
      return;
    }
    navigate("/recipe/create");
  };

  return (
    <div style={{ display: "flex" }}>
      {/* 왼쪽 필터 영역 */}
      <aside
        style={{
          width: "250px",
          padding: "1rem",
          borderRight: "1px solid #ccc",
        }}
      >
        <h3>필터</h3>

        {/* ✅ 검색 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>검색</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            style={{ width: "100%" }}
          />
        </div>

        {/* ✅ 모집 구분 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>▶구분</label>
          {["ALL", "PROJECT", "STUDY"].map((t) => (
            <label key={t} style={{ display: "block" }}>
              <input
                type="radio"
                name="type"
                checked={filters.type === t}
                onChange={() => handleTypeChange(t)}
              />
              {t === "ALL" ? "모두보기" : t === "PROJECT" ? "프로젝트" : "스터디"}
            </label>
          ))}
        </div>

        {/* ✅ 모집 상태 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>▶모집 상태</label>
          <div>
            {["OPEN", "CLOSED"].map((s) => (
              <label key={s} style={{ display: "block" }}>
                <input
                  type="radio"
                  name="recruit_status"
                  checked={filters.recruit_status === s}
                  onChange={() => toggleRecruitStatus(s)}
                />
                {s === "OPEN" ? "모집중" : "모집완료"}
              </label>
            ))}
          </div>
        </div>

        {/* ✅ 모집 기간 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>▶모집 기간</label>
          <br />
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, start_date: e.target.value }))
            }
          />
          ~
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, end_date: e.target.value }))
            }
          />
        </div>

        {/* ✅ 정확 매칭 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            <input
              type="checkbox"
              checked={filters.match_mode === "AND"}
              onChange={(e) => toggleMatchMode(e.target.checked)}
            />
            정확 매칭 (모두포함)
          </label>
        </div>

        {/* ✅ 사용 언어 */}
        <div>
          <label>▶사용 언어(다중 체크 가능)</label>
          <div>
            {skills.map((skill) => (
              <label key={skill.id} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={filters.skill_ids.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
                {skill.name}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* 오른쪽 게시글 목록 */}
      <main style={{ flex: 1, padding: "1rem" }}>
        <h2>프로젝트/스터디 게시판</h2>

        {/* 생성 버튼 */}
        <button
          style={{
            marginBottom: "1rem",
            padding: "8px 16px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={handleCreateClick}
        >
          모집공고 생성하기
        </button>

        {posts.length === 0 ? (
          <p>게시글이 없습니다.</p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
                background: "#fff",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/recipe/${post.id}`)}
            >
              {post.image_url && (
                <img
                  src={`http://localhost:8000${post.image_url}`}
                  alt="대표 이미지"
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginBottom: "10px",
                  }}
                />
              )}
              <h3 style={{ margin: "0 0 8px 0" }}>{post.title}</h3>
              <p style={{ margin: "0 0 12px 0", color: "#555" }}>
                {post.description?.length > 50
                  ? `${post.description.substring(0, 50)}...`
                  : post.description}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  margin: "0 0 10px 0",
                  color: "#777",
                }}
              >
                모집인원 {post.current_members}/{post.capacity}명 | {post.type} | 모집기간{" "}
                {post.start_date} ~ {post.end_date}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {post.skills?.map((skill) => (
                  <span
                    key={skill.id}
                    style={{
                      background: "#f0f0f0",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                    }}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
