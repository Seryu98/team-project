// frontend/src/features/project_post/ProjectPostList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ProjectPostList() {
    const [posts, setPosts] = useState([]);
    const [skills, setSkills] = useState([]); // ✅ 서버에서 불러올 수 있는 사용 언어 목록
    const navigate = useNavigate();

    const [filters, setFilters] = useState({
        type: "ALL", // PROJECT, STUDY, ALL
        status: "APPROVED",
        search: "",
        start_date: "",
        end_date: "",
        skill_ids: [],
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

                // 👉 skill_ids 배열은 따로 처리 (axios params는 자동 배열 전송 지원)
                const res = await axios.get("http://localhost:8000/recipe/list", {
                    params: queryParams,
                    paramsSerializer: (params) => {
                        const searchParams = new URLSearchParams();
                        Object.keys(params).forEach((key) => {
                            if (Array.isArray(params[key])) {
                                params[key].forEach((val) => searchParams.append(key, val));
                            } else {
                                searchParams.append(key, params[key]);
                            }
                        });
                        return searchParams.toString();
                    },
                });

                setPosts(res.data);
            } catch (err) {
                console.error("❌ 게시판 불러오기 실패:", err);
            }
        }
        fetchPosts();
    }, [filters]);


    // ✅ (예시) 언어 목록 불러오기
    useEffect(() => {
        async function fetchSkills() {
            try {
                const res = await axios.get("http://localhost:8000/meta/skills");
                setSkills(res.data);
            } catch (err) {
                console.error("❌ 스킬 목록 불러오기 실패:", err);
            }
        }
        fetchSkills();
    }, []);

    // ✅ 언어 선택 토글
    const toggleSkill = (id) => {
        setFilters((prev) => {
            const already = prev.skill_ids.includes(id);
            return {
                ...prev,
                type: "", // 언어 선택 시 프로젝트/스터디 해제
                skill_ids: already
                    ? prev.skill_ids.filter((s) => s !== id)
                    : [...prev.skill_ids, id],
            };
        });
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

                {/* ✅ 모집 구분 */}
                <div>
                    {["ALL", "PROJECT", "STUDY"].map((t) => (
                        <label key={t} style={{ display: "block" }}>
                            <input
                                type="radio"
                                name="type"
                                checked={filters.type === t}
                                onChange={() =>
                                    setFilters((prev) => ({ ...prev, type: t, skill_ids: [] }))
                                }
                            />
                            {t === "ALL" ? "모두보기" : t === "PROJECT" ? "프로젝트" : "스터디"}
                        </label>
                    ))}
                </div>

                {/* ✅ 모집 기간 */}
                <div style={{ marginTop: "1rem" }}>
                    <label>모집 기간</label>
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

                {/* ✅ 사용 언어 */}
                <div style={{ marginTop: "1rem" }}>
                    <label>사용 언어</label>
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

                {/* ✅ 검색 */}
                <div style={{ marginTop: "1rem" }}>
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
            </aside>

            {/* 오른쪽 게시글 목록 영역 */}
            <main style={{ flex: 1, padding: "1rem" }}>
                <h2>프로젝트/스터디 게시판</h2>
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
                            {/* ✅ 대표 이미지 */}
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

                            {/* ✅ 제목 */}
                            <h3 style={{ margin: "0 0 8px 0" }}>{post.title}</h3>

                            {/* ✅ 설명 (앞부분 일부만 미리보기) */}
                            <p style={{ margin: "0 0 12px 0", color: "#555" }}>
                                {post.description?.length > 50
                                    ? `${post.description.substring(0, 50)}...`
                                    : post.description}
                            </p>

                            {/* ✅ 모집 인원 / 현재 인원 / 구분 / 모집 기간 */}
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

                            {/* ✅ 사용 언어 태그 */}
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
