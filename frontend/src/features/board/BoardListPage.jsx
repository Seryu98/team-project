// frontend/src/features/board/BoardListPage.jsx
// - 댓글 수 정상 반영
// - 본문 미리보기 (20자)
// - 프로필 이미지 연결 (Top3 + 목록)
// - 상세 → 목록 복귀 시 자동 갱신

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

  // ✅ 상세페이지에서 돌아올 때 자동 새로고침
  useEffect(() => {
    if (location.state?.refresh) fetchPosts();
  }, [location.state]);

  // ✅ 목록 데이터 불러오기
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

  // ✅ 본문 요약 함수 (20자)
  const previewText = (text) => {
    if (!text) return "";
    return text.length > 20 ? text.slice(0, 20) + "..." : text;
  };

  return (
    <div className="board-wrapper">
      {/* ✅ 좌측 필터 */}
      <aside className="board-filter-panel">
        <form onSubmit={(e) => e.preventDefault()} className="filter-search">
          <input
            type="text"
            placeholder="검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>검색</button>
        </form>

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
          {[{ label: "최신순", value: "latest" },
          { label: "조회수순", value: "views" },
          { label: "좋아요순", value: "likes" }].map((opt) => (
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

        {/* 🔥 Top3 */}
        <section className="board-top3">
          <h3>🔥 오늘 가장 많이 본 글 Top 3</h3>
          {topPosts.length === 0 ? (
            <p>오늘은 인기글이 없습니다.</p>
          ) : (
            <div className="top3-list-horizontal">
              {topPosts.map((p, i) => (
                <div key={p.id} className="top3-card" onClick={() => openPost(p.id)}>
                  <div className="top3-header">
                    <span className="rank">#{i + 1}</span>
                    <h4>{p.title}</h4>
                  </div>

                  {/* ✅ 본문 요약 */}
                  {p.content_preview && (
                    <p className="top3-preview">{previewText(p.content_preview)}</p>
                  )}

                  <div className="top3-author">
                    <img
                      src={p.author?.profile_image || "/default_profile.png"}
                      alt="프로필"
                      className="top3-profile-img"
                      onClick={(e) => {
                        e.stopPropagation();
                        goProfile(p.author.id);
                      }}
                    />
                    <span
                      className="nickname"
                      onClick={(e) => {
                        e.stopPropagation();
                        goProfile(p.author.id);
                      }}
                    >
                      {p.author.nickname}
                    </span>
                  </div>
                  <div className="top3-stats">
                    👁 {p.view_count} | ❤️ {p.like_count} | 💬 댓글({p.comment_count ?? 0})
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="top3-divider" />

        {/* 📰 게시글 목록 */}
        <section className="board-list">
          <h3>📰 게시글 목록</h3>
          {loading ? (
            <p>로딩 중...</p>
          ) : posts.length === 0 ? (
            <p>게시글이 없습니다.</p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="board-card"
                onClick={() => openPost(post.id)}
              >
                <div className="board-card-header">
                  <img
                    src={post.author.profile_image || "/default_profile.png"}
                    alt="프로필"
                    className="profile-thumb-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      goProfile(post.author.id);
                    }}
                  />
                  <span
                    className="nickname"
                    onClick={(e) => {
                      e.stopPropagation();
                      goProfile(post.author.id);
                    }}
                  >
                    {post.author.nickname}
                  </span>
                  <span className="board-date">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="board-card-body">
                  <h3 className="board-title">{post.title}</h3>

                  {/* ✅ 본문 요약 미리보기 (20자) */}
                  {(post.content_preview || post.content) && (
                    <p className="board-preview">
                      {previewText(post.content_preview || post.content)}
                    </p>
                  )}

                  <p className="board-meta">
                    {post.category_name} | 👁 {post.view_count} | ❤️ {post.like_count} | 💬 댓글(
                    {post.comment_count ?? 0})
                  </p>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}