// src/features/profile/ProfilePage.jsx 전체 수정본

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";


function buildIconMap(globs) {
  const map = {};
  for (const [path, url] of Object.entries(globs)) {
    const base = path.split("/").pop().replace(".png", "").toLowerCase();
    map[base] = url;
  }
  return map;
}

const skillGlob1 = import.meta.glob("../../shared/assets/skills/*.png", { eager: true, as: "url" });
const skillGlob2 = import.meta.glob("../../app/shared/assets/skills/*.png", { eager: true, as: "url" });
const starGlob1 = import.meta.glob("../../shared/assets/star/*.png", { eager: true, as: "url" });
const starGlob2 = import.meta.glob("../../app/shared/assets/star/*.png", { eager: true, as: "url" });

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("followers");
  const [list, setList] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [comments, setComments] = useState([]);

  const SKILL_ICONS = useMemo(
    () => ({ ...buildIconMap(skillGlob1), ...buildIconMap(skillGlob2) }),
    []
  );
  const STAR_ICONS = useMemo(
    () => ({ ...buildIconMap(starGlob1), ...buildIconMap(starGlob2) }),
    []
  );

  const oneStarUrl = STAR_ICONS["onestar"] || "/assets/star/onestar.png";
  const zeroStarUrl = STAR_ICONS["zerostar"] || "/assets/star/zerostar.png";

  const resolveSkillIconUrl = (rawName) => {
    if (!rawName) return "";
    let norm = String(rawName).trim().toLowerCase().replace(/\s+/g, "_");
    const aliases = {
      "c#": "csharp",
      "c++": "cplus",
      "f#": "fsharp",
      "react native": "react_native",
      "objectiveC": "objectivec",
    };
    norm = aliases[norm] || norm;
    if (SKILL_ICONS[norm]) return SKILL_ICONS[norm];
    return `/assets/skills/${rawName.replace(/\s+/g, "_")}.png`;
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(res.data);
    } catch {
      setCurrentUser(null);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("access_token");

      let endpoint;
      if (userId) {
        // 다른 사람 프로필 - 로그인 선택적
        endpoint = `/profiles/${userId}`;
      } else {
        // 내 프로필 - 로그인 필수
        if (!token) {
          alert("로그인이 필요합니다.");
          navigate("/login");
          return;
        }
        const me = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        endpoint = `/profiles/${me.data.id}`;
      }

      // 토큰이 있으면 헤더 추가
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const res = await api.get(endpoint, config);
      setProfile(res.data);
    } catch {
      alert("프로필 불러오기 실패");
    }
  };

  const fetchPortfolios = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const targetUserId = userId || currentUser?.id;
      if (!targetUserId) return;

      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const res = await api.get(`/portfolios/user/${targetUserId}`, config);
      setPortfolios(res.data);
    } catch {
      setPortfolios([]);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const targetUserId = userId || currentUser?.id;
      if (!targetUserId) return;

      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const res = await api.get(`/comments/user/${targetUserId}`, config);
      setComments(res.data);
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile) {
      fetchPortfolios();
      fetchComments();
    }
  }, [profile]);

  const handleFollowToggle = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      if (profile.is_following) {
        await api.delete(`/follows/${profile.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile((prev) => ({
          ...prev,
          is_following: false,
          follower_count: prev.follower_count - 1,
        }));
      } else {
        await api.post(`/follows/${profile.id}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile((prev) => ({
          ...prev,
          is_following: true,
          follower_count: prev.follower_count + 1,
        }));
      }
    } catch {
      alert("팔로우/언팔로우 실패");
    }
  };

  const fetchFollowList = async (type) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      const endpoint =
        type === "followers"
          ? `/follows/${profile.id}/followers`
          : `/follows/${profile.id}/followings`;
      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data);
      setModalType(type);
      setShowModal(true);
    } catch {
      alert("목록 불러오기 실패");
    }
  };

  const handleUnfollowInModal = async (targetId) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.delete(`/follows/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList((prev) => prev.filter((u) => u.id !== targetId));
      fetchProfile();
    } catch {
      alert("팔로우 취소 실패");
    }
  };

  const handleSendMessage = () => {
    alert("메시지 기능은 준비 중입니다.");
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: "40px" }}>로딩 중...</div>;

  const isMyProfile = currentUser && currentUser.id === profile.id;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "40px 20px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "24px", fontWeight: "bold", textAlign: "center", marginBottom: "40px" }}>
          {isMyProfile ? "내 프로필" : `${profile.nickname}님의 프로필`}
        </h1>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "30px" }}>
          <div style={{ position: "relative" }}>
            <img
              src={
                profile.profile_image
                  ? profile.profile_image.startsWith("/assets")
                    ? `http://localhost:8000${profile.profile_image}`
                    : `http://localhost:8000${profile.profile_image}`
                  : "/assets/profile/default_profile.png"
              }

              alt="프로필"
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                objectFit: "cover",
                background: "#e5e7eb",
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>
              {profile.nickname}
            </h2>

            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
              {profile.headline || "자기소개가 없습니다."}
            </p>

            <div style={{ display: "flex", gap: "12px", marginBottom: "12px", fontSize: "13px" }}>
              <span
                onClick={() => fetchFollowList("followers")}
                style={{ cursor: "pointer", color: "#6b7280" }}
              >
                팔로워 <strong>{profile.follower_count}</strong>
              </span>
              <span
                onClick={() => fetchFollowList("followings")}
                style={{ cursor: "pointer", color: "#6b7280" }}
              >
                팔로잉 <strong>{profile.following_count}</strong>
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {isMyProfile ? (
                <button
                  onClick={() => navigate("/profile/create")}
                  style={{
                    padding: "6px 16px",
                    fontSize: "13px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  프로필 수정
                </button>
              ) : (
                <>
                  {currentUser && (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        style={{
                          padding: "6px 16px",
                          fontSize: "13px",
                          border: "none",
                          background: profile.is_following ? "#ef4444" : "#3b82f6",
                          color: "#fff",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        {profile.is_following ? "언팔로우" : "팔로우"}
                      </button>
                      <button
                        onClick={handleSendMessage}
                        style={{
                          padding: "6px 16px",
                          fontSize: "13px",
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        메시지
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자기소개
          </label>
          <div style={{
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            minHeight: "100px",
            background: "#fafafa",
            fontSize: "14px",
            whiteSpace: "pre-wrap"
          }}>
            {profile.bio ? profile.bio : (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>등록된 자기소개가 없습니다</p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            이력
          </label>
          <div style={{
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            minHeight: "100px",
            background: "#fafafa",
            fontSize: "14px",
            whiteSpace: "pre-wrap"
          }}>
            {profile.experience ? profile.experience : (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>등록된 이력이 없습니다</p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자격증
          </label>
          <div style={{
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            minHeight: "100px",
            background: "#fafafa",
            fontSize: "14px",
            whiteSpace: "pre-wrap"
          }}>
            {profile.certifications ? profile.certifications : (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>등록된 자격증이 없습니다</p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            사용 가능한 언어
          </label>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            minHeight: "100px",
            background: "#fafafa"
          }}>
            {(profile.skills || []).length > 0 ? (
              (profile.skills || []).map((skill) => (
                <div
                  key={skill.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "60px",
                  }}
                >
                  <img
                    src={resolveSkillIconUrl(skill.name)}
                    alt={skill.name}
                    style={{ width: "40px", height: "40px", objectFit: "contain" }}
                  />
                  <span style={{ fontSize: "11px", marginTop: "4px", textAlign: "center" }}>
                    {skill.name}
                  </span>
                  <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                    {[1, 2, 3].map((i) => (
                      <img
                        key={i}
                        src={i <= skill.level ? oneStarUrl : zeroStarUrl}
                        alt="star"
                        style={{ width: "10px", height: "10px" }}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#9ca3af", fontSize: "13px" }}>등록된 스킬이 없습니다</p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            포트폴리오
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {portfolios.length > 0 ? (
              portfolios.map((portfolio) => (
                <div
                  key={portfolio.id}
                  onClick={() => navigate(`/portfolio/${portfolio.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  {portfolio.thumbnail && (
                    <img
                      src={`http://localhost:8000${portfolio.thumbnail}`}
                      alt={portfolio.title}
                      style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: "500" }}>{portfolio.title}</p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>{portfolio.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af" }}>
                아직 연동 정보가 없습니다
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "40px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            함께한 사람들이 남긴 말
          </label>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            <button style={{ padding: "6px 12px", fontSize: "12px", background: "#ef4444", color: "#fff", borderRadius: "16px", border: "none" }}>
              😊 커뮤션 0
            </button>
            <button style={{ padding: "6px 12px", fontSize: "12px", background: "#e5e7eb", color: "#374151", borderRadius: "16px", border: "none" }}>
              👍 포트폴리오 0
            </button>
            <button style={{ padding: "6px 12px", fontSize: "12px", background: "#e5e7eb", color: "#374151", borderRadius: "16px", border: "none" }}>
              💡 프로젝트 0
            </button>
          </div>

          <div>
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "12px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <img
                      src={
                        profile.profile_image
                          ? profile.profile_image.startsWith("/assets")
                            ? `http://localhost:8000${profile.profile_image}`
                            : `http://localhost:8000${profile.profile_image}`
                          : "/assets/profile/default_profile.png"
                      }

                      alt={comment.author_name}
                      style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500" }}>{comment.author_name}</span>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>{comment.created_at}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#374151" }}>{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af" }}>
                아직 후기가 등록되지 않았습니다
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px"
          }}>
            <div style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "80vh",
              overflowY: "auto"
            }}>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>
                {modalType === "followers" ? "팔로워 목록" : "팔로잉 목록"}
              </h2>
              <div>
                {list.length > 0 ? (
                  list.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px",
                        borderRadius: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        onClick={() => {
                          setShowModal(false);
                          navigate(`/profile/${user.id}`);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flex: 1,
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={
                            profile.profile_image
                              ? profile.profile_image.startsWith("/assets")
                                ? `http://localhost:8000${profile.profile_image}`
                                : `http://localhost:8000${profile.profile_image}`
                              : "/assets/profile/default_profile.png"
                          }

                          alt={user.nickname}
                          style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                        />
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: "500" }}>{user.nickname}</p>
                          <p style={{ fontSize: "12px", color: "#6b7280" }}>{user.headline || "자기소개 없음"}</p>
                        </div>
                      </div>
                      {user.is_following && (
                        <button
                          onClick={() => handleUnfollowInModal(user.id)}
                          style={{
                            fontSize: "12px",
                            color: "#ef4444",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          취소
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", color: "#9ca3af", padding: "16px" }}>아직 아무도 없습니다.</p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  padding: "10px",
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}