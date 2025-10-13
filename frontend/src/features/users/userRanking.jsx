// src/features/users/UserRanking.jsx

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../profile/api";

export default function UserRanking() {
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [sortBy, setSortBy] = useState("followers");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ 검색어 state 추가

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
        page_size: 20,
        _t: Date.now(), // ✅ 캐시 무효화를 위한 타임스탬프
      });

      if (selectedSkills.length > 0) {
        selectedSkills.forEach((skillId) => {
          params.append("skill_ids", skillId);
        });
      }

      // ✅ 검색어 추가
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await api.get(`/users/ranking?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache', // ✅ 캐시 비활성화
          'Pragma': 'no-cache'
        }
      });
      setUsers(res.data);
      console.log('✅ 유저 랭킹 새로고침 완료:', res.data.length, '명'); // 디버깅용
    } catch (err) {
      console.error("유저 랭킹 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedSkills, page, searchQuery]); // ✅ searchQuery 의존성 추가

  // ✅ 초기 로드
  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // ✅ 필터/정렬/페이지 변경 시
  useEffect(() => {
    fetchUserRanking();
  }, [fetchUserRanking]);

  // ✅ 페이지로 돌아올 때마다 무조건 새로고침 (가장 확실한 방법)
  useEffect(() => {
    console.log('🔄 페이지 변경 감지:', location.pathname, 'key:', location.key);
    // location.pathname이 /users/ranking일 때마다 새로고침
    if (location.pathname === '/users/ranking') {
      console.log('📡 유저 랭킹 새로고침 시작...');
      fetchUserRanking();
    }
  }, [location.pathname, location.key, fetchUserRanking]);
  
  // ✅ 추가: 페이지 포커스 시에도 새로고침
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
          height: "100vh", // ✅ 전체 높이 사용
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "24px" }}>
          유저 랭킹
        </h2>

        {/* ✅ 검색 기능 추가 */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="유저 이름 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // 검색 시 1페이지로 리셋
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
                {users.map((user, index) => (
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
                    {/* ✅ 순위 뱃지 (1~3위만 표시) */}
                    {index < 3 && (
                      <div
                        style={{
                          display: "inline-block",
                          background:
                            index === 0
                              ? "#fbbf24"
                              : index === 1
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
                        {index + 1}위
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <img
                        src={
                          user.profile_image
                            ? user.profile_image.startsWith("/assets")
                              ? `http://localhost:8000${user.profile_image}`
                              : `http://localhost:8000${user.profile_image}`
                            : "/assets/profile/default_profile.png"
                        }
                        alt={user.nickname}
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "50%",
                          objectFit: "cover",
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
                ))}
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
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: "6px",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  이전
                </button>
                <span style={{ padding: "8px 16px" }}>{page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < 20}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: "6px",
                    cursor: users.length < 20 ? "not-allowed" : "pointer",
                    opacity: users.length < 20 ? 0.5 : 1,
                  }}
                >
                  다음
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}