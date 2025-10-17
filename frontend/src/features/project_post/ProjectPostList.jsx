// src/features/project_post/ProjectPostList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api"; // ✅ 인증 fetch
import "./ProjectPost.css";

export default function ProjectPostList() {
  const [posts, setPosts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: "ALL",
    status: "APPROVED",
    recruit_status: "OPEN",
    search: "",
    start_date: "",
    end_date: "",
    skill_ids: [],
    match_mode: "OR",
    page: 1,
    page_size: 15, // ✅ 페이지당 게시글 수 (권장값)
  });

  // ✅ 게시글 목록 불러오기
  useEffect(() => {
    async function fetchPosts() {
      try {
        const queryParams = Object.fromEntries(
          Object.entries({
            ...filters,
            type: filters.type === "ALL" ? "" : filters.type,
          }).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
        );

        if (Array.isArray(queryParams.skill_ids) && queryParams.skill_ids.length === 0) {
          delete queryParams.skill_ids;
        }

        const searchParams = new URLSearchParams();
        Object.keys(queryParams).forEach((key) => {
          if (Array.isArray(queryParams[key])) {
            queryParams[key].forEach((val) => searchParams.append(key, val));
          } else {
            searchParams.append(key, queryParams[key]);
          }
        });

        const queryString = searchParams.toString();
        const res = await authFetch(`/recipe/list?${queryString}`, { method: "GET" });

        setPosts(res.items);
        setTotal(res.total);
        setHasNext(res.has_next);

        // ✅ 게시글이 실제로 렌더링된 뒤에 스크롤 이동
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
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

  // ✅ 페이지 이동
  const handlePageChange = (pageNum) => {
    setFilters((prev) => ({ ...prev, page: pageNum }));
  };

  // ✅ 이전 / 다음 버튼
  const handlePrevPage = () => {
    if (filters.page > 1) {
      setFilters((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };
  const handleNextPage = () => {
    const maxPage = Math.ceil(total / filters.page_size);
    if (filters.page < maxPage) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  // ✅ 페이지 번호 계산
  const totalPages = Math.ceil(total / filters.page_size);
  const visiblePages = [];
  for (let i = 1; i <= totalPages; i++) visiblePages.push(i);

  // ✅ 생성 버튼 클릭
  const handleCreateClick = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("로그인 후 이용 가능합니다.");
      navigate("/login");
      return;
    }
    navigate("/recipe/create");
  };

  // ✅ 필터 조작 핸들러
  const handleTypeChange = (t) => {
    setFilters((prev) => ({
      ...prev,
      type: t,
      skill_ids: [],
      match_mode: "OR",
      page: 1,
    }));
  };
  const toggleSkill = (id) => {
    setFilters((prev) => {
      const already = prev.skill_ids.includes(id);
      return {
        ...prev,
        type: "ALL",
        skill_ids: already
          ? prev.skill_ids.filter((s) => s !== id)
          : [...prev.skill_ids, id],
        page: 1,
      };
    });
  };
  const toggleMatchMode = (checked) => {
    setFilters((prev) => ({
      ...prev,
      type: "ALL",
      match_mode: checked ? "AND" : "OR",
      page: 1,
    }));
  };
  const toggleRecruitStatus = (status) => {
    setFilters((prev) => ({
      ...prev,
      recruit_status: status,
      page: 1,
    }));
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

        {/* 검색 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>검색</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
            }
            style={{ width: "100%" }}
          />
        </div>

        {/* 구분 */}
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

        {/* 모집 상태 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>▶모집 상태</label>
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

        {/* 모집 기간 */}
        <div style={{ marginBottom: "1rem" }}>
          <label>▶모집 기간</label>
          <br />
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, start_date: e.target.value, page: 1 }))
            }
          />
          ~
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, end_date: e.target.value, page: 1 }))
            }
          />
        </div>

        {/* 정확 매칭 */}
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

        {/* 사용 언어 */}
        <div>
          <label>▶사용 언어(다중 선택 가능)</label>
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
      </aside>

      {/* 오른쪽 게시글 목록 */}
      <main style={{ flex: 1, padding: "1rem" }}>
        <h2>프로젝트/스터디 게시판</h2>

        <button
          onClick={handleCreateClick}
          style={{
            marginBottom: "1rem",
            padding: "8px 16px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          모집공고 생성하기
        </button>

        {posts.length === 0 ? (
          <p>게시글이 없습니다.</p>
        ) : (
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/recipe/${post.id}`)}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "20px",
                  background: "#fff",
                  cursor: "pointer",
                }}
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
                <p style={{ fontSize: "14px", color: "#777", margin: "0 0 10px 0" }}>
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
            ))}

            {/* ✅ 페이지네이션 (이전 / 번호 / 다음) */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                marginTop: "30px",
              }}
            >
              <button
                onClick={handlePrevPage}
                disabled={filters.page === 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  background: filters.page === 1 ? "#f8f9fa" : "#fff",
                  cursor: filters.page === 1 ? "not-allowed" : "pointer",
                }}
              >
                이전
              </button>

              {visiblePages.map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    background: "transparent",
                    fontWeight: filters.page === pageNum ? "bold" : "normal",
                    color: filters.page === pageNum ? "#000" : "#888",
                    cursor: "pointer",
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={handleNextPage}
                disabled={!hasNext}
                style={{
                  padding: "6px 12px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                  background: !hasNext ? "#f8f9fa" : "#fff",
                  cursor: !hasNext ? "not-allowed" : "pointer",
                }}
              >
                다음
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
