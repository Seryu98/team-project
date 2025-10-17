// src/features/users/UserRanking.jsx

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../profile/api";
import "./UserRanking.css";

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
  const [sortBy, setSortBy] = useState("score");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 21;

  // 스킬 목록 조회
  const fetchSkills = useCallback(async () => {
    try {
      const response = await api.get("/skills/search", {
        params: { limit: 200 }  // 50 → 200으로 증가
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
    <div className="user-ranking-layout">
      {/* 사이드바 */}
      <div className="user-ranking-sidebar">
        <h2 className="sidebar-title">필터 검색</h2>

        {/* 검색 기능 */}
        <div className="search-section">
          <h3 className="search-section-title">검색</h3>
          <input
            type="text"
            placeholder="제목, 설명 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>

        {/* 정렬 선택 */}
        <div className="sort-section">
          <h3 className="sort-title">정렬</h3>
          <div className="sort-options">
            <label className="sort-label">
              <input
                type="radio"
                name="sort"
                value="score"
                checked={sortBy === "score"}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="sort-radio"
              />
              <span className="sort-text">🏆 랭킹 순</span>
            </label>
            {sortBy === "score" && (
              <div className="sort-description">
                팔로워 1점 · 게시물 2점 · 좋아요 3점
              </div>
            )}
            
            <label className="sort-label">
              <input
                type="radio"
                name="sort"
                value="followers"
                checked={sortBy === "followers"}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="sort-radio"
              />
              <span className="sort-text">팔로워 순</span>
            </label>
            
            <label className="sort-label">
              <input
                type="radio"
                name="sort"
                value="recent"
                checked={sortBy === "recent"}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="sort-radio"
              />
              <span className="sort-text">최신순</span>
            </label>
          </div>
        </div>

        {/* 스킬 필터 */}
        <div className="skill-filter-section">
          <h3 className="skill-filter-title">사용 가능한 언어</h3>
          <div className="skill-options">
            {skills.map((skill) => (
              <label key={skill.id} className="skill-label">
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.id)}
                  onChange={() => handleSkillToggle(skill.id)}
                  className="skill-checkbox"
                />
                <span className="skill-name">{skill.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="user-ranking-main">
        <div className="main-container">
          <h1 className="main-title">유저 랭킹 게시판</h1>

          {loading ? (
            <div className="loading-state">로딩 중...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">조건에 맞는 유저가 없습니다</div>
          ) : (
            <>
              <div className="user-grid">
                {users.map((user, index) => {
                  const globalRank = (page - 1) * pageSize + index + 1;

                  return (
                    <div
                      key={user.id}
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="user-card"
                    >
                      {/* 1~3위까지만 배지 표시 */}
                      {globalRank <= 3 && (
                        <div className={`rank-badge ${
                          globalRank === 1 ? 'gold' : globalRank === 2 ? 'silver' : 'bronze'
                        }`}>
                          {globalRank === 1 ? "🥇 " : globalRank === 2 ? "🥈 " : "🥉 "}
                          {globalRank}위
                        </div>
                      )}

                      <div className="user-profile-section">
                        <img
                          src={resolveAvatarUrl(user.profile_image || user.avatar_path)}
                          alt={user.nickname}
                          className="user-avatar"
                          onError={(e) => {
                            console.log('❌ 이미지 로드 실패:', e.target.src);
                            e.target.src = defaultAvatar;
                          }}
                        />
                        <div className="user-info">
                          <h3 className="user-nickname">{user.nickname}</h3>
                          <p className="user-headline">
                            {user.headline || "자기소개가 없습니다"}
                          </p>
                        </div>
                      </div>

                      {/* 랭킹 점수 표시 (score 정렬일 때만) */}
                      {sortBy === "score" && user.score !== undefined && (
                        <div className="score-box">⭐ {user.score} 점</div>
                      )}

                      <div className="user-stats">
                        <span>팔로워 {user.follower_count}</span>
                        <span>팔로잉 {user.following_count}</span>
                      </div>

                      {/* 스킬 */}
                      {user.skills && user.skills.length > 0 && (
                        <div className="user-skills">
                          {user.skills.slice(0, 5).map((skill) => (
                            <span key={skill.id} className="skill-badge">
                              {skill.name}
                            </span>
                          ))}
                          {user.skills.length > 5 && (
                            <span className="skill-more">
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
              <div className="pagination">
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
                        className={`pagination-button ${page === i ? 'active' : ''}`}
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
                        className="pagination-button"
                      >
                        이전
                      </button>

                      {pageButtons}

                      <button
                        onClick={() => setPage(endPage + 1)}
                        disabled={endPage >= totalPages}
                        className="pagination-button"
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