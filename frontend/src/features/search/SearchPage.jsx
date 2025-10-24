// frontend/src/features/search/SearchPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import defaultProfileImage from "../../shared/assets/profile/default_profile.png";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ✅ 프로필 이미지 경로 처리 함수
const getProfileImageUrl = (imagePath) => {
  // 경로가 없거나 /assets/로 시작하면 기본 이미지
  if (!imagePath || imagePath.startsWith("/assets/")) {
    return defaultProfileImage;
  }

  // 완전한 URL이면 그대로 반환
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // /uploads/가 포함되어 있으면 API_URL 붙임
  if (imagePath.includes("/uploads/")) {
    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${API_URL}${cleanPath}`;
  }

  // 파일명만 있는 경우
  return `${API_URL}/uploads/${imagePath}`;
};

// ✅ HTML → 텍스트 프리뷰 유틸 (스크립트/이미지/스타일 제거)
const previewText = (html) => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // 보안/노이즈 제거
  tmp.querySelectorAll("script,style,link,meta,iframe,svg,img,video").forEach((el) => el.remove());

  // 줄바꿈 의미 태그는 공백으로 자연스럽게
  const text = (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
  return text.length > 100 ? text.slice(0, 100) + "..." : text;
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState("projects");
  const [results, setResults] = useState({ users: [], projects: [], boards: [] });
  const [loading, setLoading] = useState(false);

  const fetchSearchResults = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/search?q=${encodeURIComponent(q)}`);
      setResults(res.data);
    } catch (err) {
      console.error("검색 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam && queryParam !== query) {
      setQuery(queryParam);
    }
    if (queryParam) {
      fetchSearchResults(queryParam);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const tabs = [
    { key: "projects", label: "스터디 / 프로젝트", icon: "📚" },
    { key: "boards", label: "유저 게시판", icon: "💬" },
    { key: "users", label: "랭킹 게시판", icon: "🏆" },
  ];

  const getResultCount = (key) => {
    return results[key]?.length || 0;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #f8fafc, #e2e8f0)",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* 🔍 검색 헤더 */}
        <div
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            marginBottom: "2rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "bold",
              marginBottom: "1.5rem",
              color: "#1e293b",
            }}
          >
            🔍 통합 검색
          </h1>

          <div onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch(e);
                }
              }}
              style={{
                flex: 1,
                padding: "1rem 1.5rem",
                border: "2px solid #e2e8f0",
                borderRadius: "0.75rem",
                outline: "none",
                fontSize: "1rem",
                transition: "all 0.2s",
                backgroundColor: "#f8fafc",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.backgroundColor = "white";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.backgroundColor = "#f8fafc";
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                border: "none",
                padding: "1rem 2rem",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "1rem",
                boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow =
                  "0 8px 12px -1px rgba(59, 130, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow =
                  "0 4px 6px -1px rgba(59, 130, 246, 0.3)";
              }}
            >
              검색
            </button>
          </div>
        </div>

        {/* 🗂️ 탭 네비게이션 */}
        <div
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "0.75rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.1)",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: isActive
                    ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                    : "transparent",
                  color: isActive ? "white" : "#64748b",
                  fontWeight: isActive ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  fontSize: "0.95rem",
                  boxShadow: isActive
                    ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.25rem" }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {query && (
                    <span
                      style={{
                        background: isActive ? "rgba(255,255,255,0.2)" : "#e2e8f0",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "1rem",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}
                    >
                      {getResultCount(tab.key)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 📊 검색 결과 */}
        <div
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "2rem",
            minHeight: "400px",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
              <p style={{ fontSize: "1.125rem", fontWeight: "500" }}>검색중...</p>
            </div>
          ) : !query ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
              <p style={{ fontSize: "1.125rem" }}>검색어를 입력해주세요</p>
            </div>
          ) : (
            <>
              {activeTab === "projects" && (
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      marginBottom: "1.5rem",
                      color: "#1e293b",
                    }}
                  >
                    📚 스터디 / 프로젝트 ({results.projects.length})
                  </h3>
                  {results.projects.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "#94a3b8",
                        fontSize: "1rem",
                      }}
                    >
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {results.projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/recipe/${p.id}`)}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.75rem",
                            padding: "1.5rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            backgroundColor: "white",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#3b82f6";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(59, 130, 246, 0.15)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <div style={{ display: "flex", gap: "1.25rem" }}>
                            {/* 프로젝트 이미지 */}
                            {p.image_url && (
                              <img
                                src={
                                  p.image_url.startsWith("http")
                                    ? p.image_url
                                    : `${API_URL}${p.image_url}`
                                }
                                alt={p.title}
                                style={{
                                  width: "100px",
                                  height: "100px",
                                  borderRadius: "0.5rem",
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  border: "1px solid #e2e8f0",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}

                            {/* 프로젝트 정보 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  marginBottom: "0.5rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <h4
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "1.125rem",
                                    color: "#1e293b",
                                    margin: 0,
                                  }}
                                >
                                  {p.title}
                                </h4>

                                {/* 타입 뱃지 (프로젝트/스터디) */}
                                <span
                                  style={{
                                    backgroundColor:
                                      p.type === "PROJECT" ? "#dbeafe" : "#fef3c7",
                                    color:
                                      p.type === "PROJECT" ? "#1e40af" : "#92400e",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "9999px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {p.type === "PROJECT" ? "프로젝트" : "스터디"}
                                </span>

                                {/* 모집 상태 뱃지 */}
                                {p.status && (
                                  <span
                                    style={{
                                      backgroundColor:
                                        p.status === "모집중" ? "#dcfce7" : "#f3f4f6",
                                      color:
                                        p.status === "모집중" ? "#166534" : "#6b7280",
                                      padding: "0.25rem 0.75rem",
                                      borderRadius: "9999px",
                                      fontSize: "0.75rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {p.status}
                                  </span>
                                )}
                              </div>

                              {/* 설명 (HTML 렌더링 지원) */}
                              <div
                                style={{
                                  fontSize: "0.9rem",
                                  color: "#64748b",
                                  lineHeight: "1.5",
                                  marginBottom: "0.75rem",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: p.description
                                    ? p.description.length > 100
                                      ? p.description.substring(0, 100) + "..."
                                      : p.description
                                    : "설명 없음",
                                }}
                              />

                              {/* 기술 스택 태그 */}
                              {p.skills && p.skills.length > 0 && (
                                <div>
                                  <p
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#94a3b8",
                                      marginBottom: "0.5rem",
                                      fontWeight: "500",
                                    }}
                                  >
                                    사용 언어/기술
                                  </p>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.5rem",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {p.skills.slice(0, 8).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          backgroundColor: "#f1f5f9",
                                          color: "#475569",
                                          padding: "0.25rem 0.75rem",
                                          borderRadius: "0.375rem",
                                          fontSize: "0.75rem",
                                          fontWeight: "500",
                                          border: "1px solid #e2e8f0",
                                        }}
                                      >
                                        {skill.name || skill}
                                      </span>
                                    ))}
                                    {p.skills.length > 8 && (
                                      <span
                                        style={{
                                          color: "#94a3b8",
                                          padding: "0.25rem 0.5rem",
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        +{p.skills.length - 8}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "boards" && (
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      marginBottom: "1.5rem",
                      color: "#1e293b",
                    }}
                  >
                    💬 유저 게시판 ({results.boards.length})
                  </h3>
                  {results.boards.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "#94a3b8",
                        fontSize: "1rem",
                      }}
                    >
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {results.boards.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => navigate(`/board/${b.id}`)}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.75rem",
                            padding: "1.5rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            backgroundColor: "white",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#3b82f6";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(59, 130, 246, 0.15)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <h4
                            style={{
                              fontWeight: "600",
                              fontSize: "1.125rem",
                              marginBottom: "0.5rem",
                              color: "#1e293b",
                            }}
                          >
                            {b.title}
                          </h4>
                          <p
                            style={{
                              fontSize: "0.9rem",
                              color: "#64748b",
                              lineHeight: "1.5",
                            }}
                          >
                            {/* ✅ 백엔드가 content_preview를 주면 우선 사용, 없으면 로컬에서 HTML→텍스트 */}
                            {(b.content_preview ?? previewText(b.content)) || "내용 없음"}

                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "users" && (
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      marginBottom: "1.5rem",
                      color: "#1e293b",
                    }}
                  >
                    🏆 랭킹 게시판 ({results.users.length})
                  </h3>
                  {results.users.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "#94a3b8",
                        fontSize: "1rem",
                      }}
                    >
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {results.users.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => navigate(`/profile/${u.id}`)}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.75rem",
                            padding: "1.5rem",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            backgroundColor: "white",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#3b82f6";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(59, 130, 246, 0.15)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
                            {/* 프로필 이미지 */}
                            <img
                              src={getProfileImageUrl(u.profile_image)}
                              alt={u.nickname}
                              style={{
                                width: "60px",
                                height: "60px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "3px solid #e2e8f0",
                                flexShrink: 0,
                                backgroundColor: "#f3f4f6",
                              }}
                              onError={(e) => {
                                console.log("프로필 이미지 로드 실패:", u.nickname, u.profile_image);
                                e.target.src = defaultProfileImage;
                              }}
                            />

                            {/* 유저 정보 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                <h4
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "1.125rem",
                                    color: "#1e293b",
                                    margin: 0,
                                  }}
                                >
                                  {u.nickname}
                                </h4>

                                {/* 팔로워 수 */}
                                {u.follower_count !== undefined && (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      backgroundColor: "#f1f5f9",
                                      padding: "0.25rem 0.75rem",
                                      borderRadius: "9999px",
                                      fontSize: "0.875rem",
                                      color: "#64748b",
                                    }}
                                  >
                                    👥 {u.follower_count}
                                  </span>
                                )}
                              </div>

                              {/* 한줄 자기소개 */}
                              {u.headline && (
                                <p
                                  style={{
                                    fontSize: "0.9rem",
                                    color: "#64748b",
                                    marginBottom: "0.75rem",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {u.headline}
                                </p>
                              )}

                              {/* 스킬/언어 태그 */}
                              {u.skills && u.skills.length > 0 && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    flexWrap: "wrap",
                                    marginTop: "0.75rem",
                                  }}
                                >
                                  {u.skills.slice(0, 5).map((skill, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        backgroundColor: "#eff6ff",
                                        color: "#2563eb",
                                        padding: "0.25rem 0.75rem",
                                        borderRadius: "0.375rem",
                                        fontSize: "0.8rem",
                                        fontWeight: "500",
                                      }}
                                    >
                                      {skill.name || skill}
                                    </span>
                                  ))}
                                  {u.skills.length > 5 && (
                                    <span
                                      style={{
                                        color: "#94a3b8",
                                        padding: "0.25rem 0.5rem",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      +{u.skills.length - 5}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
