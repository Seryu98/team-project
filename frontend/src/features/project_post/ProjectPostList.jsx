// /src/features/project_post/ProjectPostList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../auth/api";
import "./ProjectPost.css"; // ✅ CSS 임포트

export default function ProjectPostList() {
  const [posts, setPosts] = useState([]);
  const [skills, setSkills] = useState([]);
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

  // ✅ 구분 선택 시
  const handleTypeChange = (t) => {
    setFilters((prev) => ({
      ...prev,
      type: t,
      skill_ids: [],
      match_mode: "OR",
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

  // ✅ 모집 상태
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
    <div className="project-wrapper">
      {/* 왼쪽 필터 영역 */}
      <aside className="project-filter-panel">
        <h3>필터</h3>

        {/* ✅ 검색 */}
        <div className="filter-group">
          <label className="filter-group-title">검색</label>
          <input
            type="text"
            className="search-input"
            placeholder="제목, 설명 검색..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>

        {/* ✅ 모집 구분 */}
        <div className="filter-group">
          <label className="filter-group-title">구분</label>
          <div className="filter-radio-group">
            {["ALL", "PROJECT", "STUDY"].map((t) => (
              <label key={t} className="filter-option-label">
                <input
                  type="radio"
                  name="type"
                  checked={filters.type === t}
                  onChange={() => handleTypeChange(t)}
                />
                <span>
                  {t === "ALL" ? "모두보기" : t === "PROJECT" ? "프로젝트" : "스터디"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ✅ 모집 상태 */}
        <div className="filter-group">
          <label className="filter-group-title">모집 상태</label>
          <div className="filter-radio-group">
            {["OPEN", "CLOSED"].map((s) => (
              <label key={s} className="filter-option-label">
                <input
                  type="radio"
                  name="recruit_status"
                  checked={filters.recruit_status === s}
                  onChange={() => toggleRecruitStatus(s)}
                />
                <span>{s === "OPEN" ? "모집중" : "모집완료"}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ✅ 모집 기간 */}
        <div className="filter-group">
          <label className="filter-group-title">모집 기간</label>
          <div className="date-range">
            <input
              type="date"
              className="date-input"
              value={filters.start_date}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, start_date: e.target.value }))
              }
            />
            <span className="date-separator">~</span>
            <input
              type="date"
              className="date-input"
              value={filters.end_date}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, end_date: e.target.value }))
              }
            />
          </div>
        </div>

        {/* ✅ 정확 매칭 */}
        <div className="filter-group">
          <label className="filter-option-label">
            <input
              type="checkbox"
              checked={filters.match_mode === "AND"}
              onChange={(e) => toggleMatchMode(e.target.checked)}
            />
            <span>정확 매칭 (모두포함)</span>
          </label>
        </div>

        {/* ✅ 사용 언어 */}
        <div className="filter-group">
          <label className="filter-group-title">사용 언어</label>
          <div className="filter-checkbox-group">
            {skills.map((skill) => (
              <label key={skill.id} className="filter-option-label">
                <input
                  type="checkbox"
                  checked={filters.skill_ids.includes(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
                <span>{skill.name}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* 오른쪽 게시글 목록 */}
      <main className="project-content">
        <div className="project-header">
          <h2>프로젝트 / 스터디 모집</h2>
          <button className="create-btn" onClick={handleCreateClick}>
            ✨ 모집공고 생성하기
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-text">게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="project-list">
            {posts.map((post) => (
              <div
                key={post.id}
                className="project-card"
                onClick={() => navigate(`/recipe/${post.id}`)}
              >
                {post.image_url && (
                  <img
                    src={`http://localhost:8000${post.image_url}`}
                    alt="대표 이미지"
                    className="project-thumbnail"
                  />
                )}
                
                <div className="project-card-body">
                  <h3 className="project-title">{post.title}</h3>
                  
                  <p className="project-description">
                    {post.description?.length > 100
                      ? `${post.description.substring(0, 100)}...`
                      : post.description}
                  </p>
                  
                  <div className="project-meta">
                    <span className="meta-item">
                      <span className="meta-highlight">
                        {post.current_members}/{post.capacity}명
                      </span>
                    </span>
                    <span className="meta-divider"></span>
                    <span className="meta-item">{post.type}</span>
                    <span className="meta-divider"></span>
                    <span className="meta-item">
                      {post.start_date} ~ {post.end_date}
                    </span>
                  </div>
                  
                  <div className="project-skills">
                    {post.skills?.map((skill) => (
                      <span key={skill.id} className="skill-tag">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}