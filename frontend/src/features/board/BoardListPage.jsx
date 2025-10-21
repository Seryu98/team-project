// frontend/src/features/board/BoardListPage.jsx
// - 제목 최상단 배치
// - 🔥 인기급상승 배지 제목 왼쪽
// - 댓글 수/프로필/미리보기 정상 반영

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getBoardPosts } from "./BoardAPI";
import "./Board.css";

export default function BoardListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ 상세페이지 복귀 시 자동 새로고침
  useEffect(() => {
    if (location.state?.refresh) fetchPosts();
  }, [location.state]);

  // ✅ 목록 로딩
  useEffect(() => {
    fetchPosts();
  }, [category, sort, search]);

  async function fetchPosts() {
    try {
      setLoading(true);
      const res = await getBoardPosts({
        category: category === "전체" ? "" : category,
        sort,
        search,
      });
      setPosts(res.posts || []);
      setTopPosts(res.top_posts || []);
    } catch (err) {
      console.error("게시글 목록 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  const openPost = (id) => navigate(`/board/${id}`);
  const writePost = () => navigate("/board/write");
  const goProfile = (id) => navigate(`/profile/${id}`);

  const previewText = (html) => {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html; // HTML 파싱
    const text = tmp.textContent || tmp.innerText || "";
    return text.length > 50 ? text.slice(0, 50) + "..." : text;
  };


  return (
    <div className="board-wrapper">
      {/* ✅ 좌측 필터 */}
      <aside className="board-filter-panel">
        <h3 className="sidebar-title">필터</h3>

        {/* ✅ 검색 섹션 */}
        <div className="search-section">
          <h4 className="search-section-title">검색</h4>
          <input
            type="text"
            placeholder="제목, 설명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <h4>카테고리</h4>
          {["전체", "홍보글", "잡담글", "자랑글", "질문&답변", "정보공유"].map(
            (cat) => (
              <label key={cat} className="filter-option">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                />
                {cat}
              </label>
            )
          )}
        </div>

        <div className="filter-section">
          <h4>정렬</h4>
          {[
            { label: "최신순", value: "latest" },
            { label: "조회수순", value: "views" },
            { label: "좋아요순", value: "likes" },
          ].map((opt) => (
            <label key={opt.value} className="filter-option">
              <input
                type="radio"
                name="sort"
                value={opt.value}
                checked={sort === opt.value}
                onChange={() => setSort(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </aside>

      {/* ✅ 메인 컨텐츠 */}
      <main className="board-content">
        <div className="board-header">
          <h2>유저 게시판</h2>
          <button className="write-btn" onClick={writePost}>
            ✏️ 글쓰기
          </button>
        </div>

        {/* 🔥 주간 Top3 */}
        <section className="board-top3">
          <h3>🔥 이번 주 인기글 Top 3</h3>
          {topPosts.length === 0 ? (
            <p>이번 주에는 아직 인기글이 없습니다.</p>
          ) : (
            <div className="top3-list-horizontal">
              {topPosts.map((p, i) => (
                <div key={p.id} className="top3-card" onClick={() => openPost(p.id)}>
                  {/* 🏅 배지 */}
                  {p.badge && (
                    <div className="top3-badge-wrap">
                      {p.badge.includes("Gold Medal") && (
                        <span className="badge-medal badge-gold">🥇 1위</span>
                      )}
                      {p.badge.includes("Silver Medal") && (
                        <span className="badge-medal badge-silver">🥈 2위</span>
                      )}
                      {p.badge.includes("Bronze Medal") && (
                        <span className="badge-medal badge-bronze">🥉 3위</span>
                      )}
                      {p.badge.includes("인기급상승") && (
                        <span className="badge-hot">🔥 인기급상승</span>
                      )}
                    </div>
                  )}

                  {/* 제목 + 날짜 */}
                  <div className="top3-title-row">
                    <div className="title-left">
                      <span className="rank">#{i + 1}</span>
                      <h4 className="top3-title">{p.title}</h4>
                    </div>
                    <span className="top3-date">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* 본문 미리보기 */}
                  {p.content_preview && (
                    <p className="top3-preview">{previewText(p.content_preview)}</p>
                  )}

                  {/* 카테고리 | 조회수 | 댓글 */}
                  <div className="top3-meta">
                    {p.category_name} | 👁 {p.view_count} | 💬 댓글({p.comment_count ?? 0})
                  </div>

                  {/* 작성자 + 좋아요 */}
                  <div className="top3-footer">
                    <div className="top3-author">
                      <img
                        src={
                          p.author?.profile_image
                            ? `http://localhost:8000${p.author.profile_image}`
                            : "http://localhost:8000/assets/profile/default_profile.png"
                        }
                        alt="프로필"
                        className="top3-profile-img"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.author?.id) goProfile(p.author.id);
                        }}
                      />
                      <span
                        className="nickname"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.author?.id) goProfile(p.author.id);
                        }}
                      >
                        {p.author?.nickname ?? "탈퇴한 사용자"}
                      </span>
                    </div>
                    <div className="like-info">❤️ {p.like_count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>


        <hr className="top3-divider" />
        {/* 📰 게시글 목록 */}
        <section className="board-section">
          <h3 className="board-section-title">📰 게시글 목록</h3>
          <div className="board-list">
            {loading ? (
              <p>로딩 중...</p>
            ) : posts.length === 0 ? (
              <p>게시글이 없습니다.</p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="board-card-horizontal"
                  onClick={() => openPost(post.id)}
                >
                  {/* ✅ 왼쪽 썸네일 (항상 DB에서 온 이미지 표시) */}
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL}${post.attachment_url}`}
                    alt={`${post.category_name} 썸네일`}
                    className="board-thumbnail"
                  />

                  {/* ✅ 오른쪽 콘텐츠 */}
                  <div className="board-card-content">
                    <div className="board-card-top">
                      <div className="title-row">
                        {post.badge?.includes("🔥") && (
                          <span className="badge-hot">🔥 인기급상승</span>
                        )}
                        <h3 className="board-title">{post.title}</h3>
                      </div>
                      <span className="board-date">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {(post.content_preview || post.content) && (
                      <p className="board-preview">
                        {previewText(post.content_preview || post.content)}
                      </p>
                    )}

                    <p className="board-meta">
                      {post.category_name} | 👁 {post.view_count} | 💬 댓글(
                      {post.comment_count ?? 0})
                    </p>

                    <div className="board-bottom">
                      <div className="author-info">
                        <img
                          src={
                            post.author?.profile_image
                              ? `http://localhost:8000${post.author.profile_image}`
                              : "http://localhost:8000/assets/profile/default_profile.png"
                          }
                          alt="프로필"
                          className="profile-thumb-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (post.author?.id) goProfile(post.author.id);
                          }}
                        />
                        <span
                          className="nickname"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (post.author?.id) goProfile(post.author.id);
                          }}
                        >
                          {post.author?.nickname ?? "탈퇴한 사용자"}
                        </span>
                      </div>
                      <div className="like-info">❤️ {post.like_count}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
