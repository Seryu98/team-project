import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 생성페이지 이동
import axios from "axios";

export default function ProjectPostList() {
    const [posts, setPosts] = useState([]);
    const [filters, setFilters] = useState({
        type: "",
        status: "APPROVED",
        skill_ids: [],
        start_date: "",
        end_date: "",
        search: "",
        page: 1,
        page_size: 10,
    });

    const navigate = useNavigate();

    // ▶ 게시판 목록 불러오기
    useEffect(() => {
        async function fetchPosts() {
            try {
                const res = await axios.get("http://localhost:8000/recipe/list", {
                    params: {
                        type: filters.type || null,          // 프로젝트/스터디
                        status: filters.status || null,      // APPROVED 기본
                        skill_ids: filters.skill_ids,        // 배열
                        start_date: filters.start_date || null,
                        end_date: filters.end_date || null,
                        search: filters.search || null,      // 검색어
                        page: filters.page,
                        page_size: filters.page_size,
                    },
                });
                setPosts(res.data);
            } catch (err) {
                console.error("❌ 게시판 불러오기 실패:", err);
            }
        }
        fetchPosts();
    }, [filters]);

    return (
        <div style={{ display: "flex" }}>
            {/* 왼쪽 필터 영역 */}
            <aside style={{ width: "250px", padding: "1rem", borderRight: "1px solid #ccc" }}>
                <h3>필터</h3>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.type === "PROJECT"}
                            onChange={() =>
                                setFilters((prev) => ({ ...prev, type: prev.type === "PROJECT" ? "" : "PROJECT" }))
                            }
                        />
                        프로젝트
                    </label>
                    <br />
                    <label>
                        <input
                            type="checkbox"
                            checked={filters.type === "STUDY"}
                            onChange={() =>
                                setFilters((prev) => ({ ...prev, type: prev.type === "STUDY" ? "" : "STUDY" }))
                            }
                        />
                        스터디
                    </label>
                </div>

                <div style={{ marginTop: "1rem" }}>
                    <label>검색</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                        style={{ width: "100%" }}
                    />
                </div>
            </aside>

            {/* 오른쪽 게시글 목록 영역 */}
            <main style={{ flex: 1, padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2>프로젝트/스터디 게시판</h2>

                    {/* ✅ 생성 페이지 이동 버튼 */}
                    <button
                        style={{ padding: "10px 20px" }}
                        onClick={() => navigate("/recipe/create")}
                    >
                        모집공고 생성하기
                    </button>
                </div>

                {posts.length === 0 ? (
                    <p>게시글이 없습니다.</p>
                ) : (
                    posts.map((post) => (
                        <div
                            key={post.id}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                padding: "1rem",
                                marginBottom: "1rem",
                                cursor: "pointer", // ✅ 상세 페이지 이동 대비
                            }}
                            onClick={() => navigate(`/recipe/${post.id}`)} // ✅ 상세 페이지 이동 준비
                        >
                            {/* 대표 이미지 */}
                            {post.image_url && (
                                <img
                                    src={`http://localhost:8000${post.image_url}`}
                                    alt="대표 이미지"
                                    style={{ width: "100px", height: "100px", objectFit: "cover" }}
                                />
                            )}

                            <h3>{post.title}</h3>
                            <p>{post.description}</p>
                            <small>
                                모집인원 {post.capacity}명 | {post.type} | 모집기간 {post.start_date} ~ {post.end_date}
                            </small>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
