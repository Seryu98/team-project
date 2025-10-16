// src/features/users/UserRanking.jsx

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../profile/api";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const defaultAvatar = `${API_URL}/assets/profile/default_profile.png`;

function resolveAvatarUrl(avatar_path) {
  if (!avatar_path) return defaultAvatar;

  if (avatar_path.startsWith("http://") || avatar_path.startsWith("https://")) {
    return avatar_path;
  }

  if (avatar_path.startsWith("/assets")) {
    return `${API_URL}${avatar_path}`;
  }

  if (avatar_path.startsWith("/uploads")) {
    return `${API_URL}${avatar_path}`;
  }

  return `${API_URL}/uploads/${avatar_path}`;
}

export default function UserRanking() {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [skills, setSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [sortBy, setSortBy] = useState("score"); // ✅ 기본값을 "score"로 변경
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 21;

  // 스킬 목록 조회
  const fetchSkills = useCallback(async () => {
    try {
      const response = await api.get("/skills/search", {
        params: { limit: 50 }
      });
      setSkills(response.data);
    } catch (error) {
      console.error("스킬 조회 실패:", error);
    }
  }, []);

  // 유저 랭킹 조회
  const fetchUserRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sort: sortBy,
        page: page,
        page_size: 21,
        _t: Date.now(),
      });

      if (selectedSkills.length > 0) {
        selectedSkills.forEach((skillId) => {
          params.append("skill_ids", skillId);
        });
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await api.get(`/users/ranking?${params.toString()}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      setUsers(res.data.users);
      setTotalCount(res.data.total_count);

      console.log("✅ 유저 랭킹 새로고침 완료:", res.data.users.length, "명");
    } catch (err) {
      console.error("유저 랭킹 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedSkills, page, searchQuery]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    const load = async () => {
      await fetchUserRanking();
    };
    load();
  }, [fetchUserRanking]);

  useEffect(() => {
    console.log('🔄 페이지 변경 감지:', location.pathname, 'key:', location.key);
    if (location.pathname === '/users/ranking') {
      console.log('📡 유저 랭킹 새로고침 시작...');
      fetchUserRanking();
    }
  }, [location.pathname, location.key, fetchUserRanking]);

  useEffect(() => {
    const handleFocus = () => {
      console.log('👁️ 윈도우 포커스 - 새로고침');
      fetchUserRanking();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchUserRanking]);

  const handleSkillToggle = (skillId) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
    setPage(1);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      {/* 사이드바 */}
      <div
        style={{
          width: "280px",
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          padding: "24px",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "24px" }}>
          유저 랭킹
        </h2>

        {/* 검색 기능 */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="유저 이름 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
            }}
          />
        </div>

        {/* 정렬 선택 */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
            정렬
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* ✅ 랭킹 순 추가 */}
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="radio"
                name="sort"
                value="score"
                checked={sortBy === "score"}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                style={{ marginRight: "8px" }}
              />
              <span style={{ fontSize: "14px" }}>🏆 랭킹 순</span>
            </label>
            {/* ✅ 랭킹 점수 설명 추가 */}
            {sortBy === "score" && (
              <div style={{ 
                fontSize: "11px", 
                color: "#6b7280", 
                marginLeft: "24px",
                marginTop: "-4px",
                marginBottom: "4px"
              }}>
                팔로워 1점 · 게시물 2점 · 좋아요 3점
              </div>
            )}
            
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="radio"
                name="sort"
                value="followers"
                checked={sortBy === "followers"}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                style={{ marginRight: "8px" }}
              />
              <span style={{ fontSize: "14px" }}>팔로워 순</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="radio"
                name="sort"
                value="recent"
                checked={sortBy === "recent"}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                style={{ marginRight: "8px" }}
              />
              <span style={{ fontSize: "14px" }}>최신순</span>
            </label>
          </div>
        </div>

        {/* 스킬 필터 */}
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
            사용 가능한 언어
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {skills.map((skill) => (
              <label
                key={skill.id}
                style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.id)}
                  onChange={() => handleSkillToggle(skill.id)}
                  style={{ marginRight: "8px" }}
                />
                <span style={{ fontSize: "14px" }}>{skill.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, padding: "40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "32px" }}>
            유저 랭킹 게시판
          </h1>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
              로딩 중...
            </div>
          ) : users.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px",
                background: "#fff",
                borderRadius: "12px",
                color: "#9ca3af",
              }}
            >
              조건에 맞는 유저가 없습니다
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "20px",
                }}
              >
                {users.map((user, index) => {
                  const globalRank = (page - 1) * pageSize + index + 1;

                  return (
                    <div
                      key={user.id}
                      onClick={() => navigate(`/profile/${user.id}`)}
                      style={{
                        background: "#fff",
                        borderRadius: "12px",
                        padding: "24px",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                      }}
                    >
                      {/* ✅ 1~3위까지만 배지 표시 */}
                      {globalRank <= 3 && (
                        <div
                          style={{
                            display: "inline-block",
                            background:
                              globalRank === 1
                                ? "#fbbf24"
                                : globalRank === 2
                                  ? "#d1d5db"
                                  : "#f59e0b",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: "bold",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          {globalRank === 1 ? "🥇 " : globalRank === 2 ? "🥈 " : "🥉 "}
                          {globalRank}위
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <img
                          src={resolveAvatarUrl(user.profile_image || user.avatar_path)}
                          alt={user.nickname}
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            console.log('❌ 이미지 로드 실패:', e.target.src);
                            e.target.src = defaultAvatar;
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>
                            {user.nickname}
                          </h3>
                          <p style={{ fontSize: "13px", color: "#6b7280" }}>
                            {user.headline || "자기소개가 없습니다"}
                          </p>
                        </div>
                      </div>

                      {/* ✅ 랭킹 점수 표시 (score 정렬일 때만) */}
                      {sortBy === "score" && user.score !== undefined && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "8px 12px",
                            background: "#fef3c7",
                            borderRadius: "8px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#92400e",
                          }}
                        >
                          ⭐ {user.score} 점
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          marginTop: "16px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        <span>팔로워 {user.follower_count}</span>
                        <span>팔로잉 {user.following_count}</span>
                      </div>

                      {/* 스킬 */}
                      {user.skills && user.skills.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            marginTop: "12px",
                          }}
                        >
                          {user.skills.slice(0, 5).map((skill) => (
                            <span
                              key={skill.id}
                              style={{
                                fontSize: "11px",
                                background: "#e0e7ff",
                                color: "#4338ca",
                                padding: "4px 8px",
                                borderRadius: "6px",
                              }}
                            >
                              {skill.name}
                            </span>
                          ))}
                          {user.skills.length > 5 && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                padding: "4px 8px",
                              }}
                            >
                              +{user.skills.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 페이지네이션 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "40px",
                }}
              >
                {(() => {
                  const pageGroupSize = 5;
                  const totalPages = Math.max(1, Math.ceil(totalCount / 21));
                  const currentGroup = Math.floor((page - 1) / pageGroupSize);
                  const startPage = currentGroup * pageGroupSize + 1;
                  const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);

                  const pageButtons = [];
                  for (let i = startPage; i <= endPage; i++) {
                    pageButtons.push(
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          background: page === i ? "#3b82f6" : "#fff",
                          color: page === i ? "#fff" : "#000",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        {i}
                      </button>
                    );
                  }

                  return (
                    <>
                      <button
                        onClick={() => setPage(startPage - 1)}
                        disabled={startPage === 1}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          borderRadius: "6px",
                          cursor: startPage === 1 ? "not-allowed" : "pointer",
                          opacity: startPage === 1 ? 0.5 : 1,
                        }}
                      >
                        이전
                      </button>

                      {pageButtons}

                      <button
                        onClick={() => setPage(endPage + 1)}
                        disabled={endPage >= totalPages}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          borderRadius: "6px",
                          cursor: endPage >= totalPages ? "not-allowed" : "pointer",
                          opacity: endPage >= totalPages ? 0.5 : 1,
                        }}
                      >
                        다음
                      </button>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}