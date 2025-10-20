// src/features/profile/ProfilePage.jsx

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

  // 프로젝트 상태
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [endedProjects, setEndedProjects] = useState([]);
  const [pendingProjects, setPendingProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("ongoing");
  const [projectPages, setProjectPages] = useState({
    ongoing: 1,
    pending: 1,
    ended: 1
  });
  const [postPages, setPostPages] = useState({
    posts: 1,
    comments: 1
  });
  const ITEMS_PER_PAGE = 5;

  //  게시글/댓글 상태 추가
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [postTab, setPostTab] = useState("posts");

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

  const paginate = (items, currentPage) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems) => {
    return Math.ceil(totalItems / ITEMS_PER_PAGE);
  };

  const Pagination = ({ currentPage, totalItems, onPageChange }) => {
    const totalPages = getTotalPages(totalItems);

    if (totalPages <= 1) return null;

    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        marginTop: "16px"
      }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            border: "1px solid #d1d5db",
            background: currentPage === 1 ? "#f3f4f6" : "#fff",
            color: currentPage === 1 ? "#9ca3af" : "#374151",
            borderRadius: "6px",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          이전
        </button>

        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            border: "1px solid #d1d5db",
            background: currentPage === totalPages ? "#f3f4f6" : "#fff",
            color: currentPage === totalPages ? "#9ca3af" : "#374151",
            borderRadius: "6px",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          다음
        </button>
      </div>
    );
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
        endpoint = `/profiles/${userId}`;
      } else {
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

      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const res = await api.get(endpoint, config);

      console.log("=== 🔍 프로필 조회 ===");
      console.log("📥 전체 프로필:", res.data);
      console.log("👁️ visibility:", res.data.visibility);
      console.log("🎂 birth_date:", res.data.birth_date);
      console.log("🔒 birth_date visibility 값:", res.data.visibility?.birth_date);
      console.log("👤 currentUser?.id:", currentUser?.id);
      console.log("👤 profile.id:", res.data.id);
      console.log("🤔 isMyProfile:", currentUser?.id === res.data.id);

      setProfile(res.data);
    } catch {
      alert("프로필 불러오기 실패");
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const config = { headers: { Authorization: `Bearer ${token}` } };

      let allProjects = [];
      if (userId) {
        const res = await api.get(`/profiles/${userId}/projects`, config);
        allProjects = Array.isArray(res.data) ? res.data : [];
      } else {
        const res = await api.get("/recipe/my-projects", config);
        allProjects = Array.isArray(res.data) ? res.data : [];
      }

      setOngoingProjects(
        allProjects.filter(
          (p) => p.status === "APPROVED" && p.project_status === "ONGOING"
        )
      );

      setPendingProjects(allProjects.filter((p) => p.status === "PENDING"));

      setEndedProjects(allProjects.filter((p) => p.project_status === "ENDED"));
    } catch (err) {
      console.error("❌ 프로젝트 불러오기 에러:", err.response?.data || err.message);
      setOngoingProjects([]);
      setPendingProjects([]);
      setEndedProjects([]);
    }
  };

  const fetchMyPosts = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const targetUserId = userId || currentUser?.id;
      if (!targetUserId) return;

      const res = await api.get(`/board/user/${targetUserId}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyPosts(Array.isArray(res.data) ? res.data : res.data.posts || []);
    } catch (err) {
      console.error("❌ 게시글 불러오기 실패:", err);
      setMyPosts([]);
    }
  };

  const fetchMyComments = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const targetUserId = userId || currentUser?.id;
      if (!targetUserId) return;

      if (currentUser?.id !== Number(targetUserId) && currentUser?.role !== "ADMIN") {
        setMyComments([]);
        return;
      }

      const res = await api.get(`/board/user/${targetUserId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyComments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ 댓글 불러오기 실패:", err);
      setMyComments([]);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile) {
      fetchProjects();
      fetchMyPosts();
      fetchMyComments();
    }
  }, [profile, currentUser]);

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

  const handleProjectTabChange = (tab) => {
    setActiveTab(tab);
    setProjectPages(prev => ({ ...prev, [tab]: 1 }));
  };

  const handlePostTabChange = (tab) => {
    setPostTab(tab);
    setPostPages(prev => ({ ...prev, [tab]: 1 }));
  };

  const renderProjectList = (projects, tabName) => {
    if (projects.length === 0) {
      return (
        <div style={{ width: "100%", textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af" }}>
          프로젝트가 없습니다
        </div>
      );
    }

    const currentPage = projectPages[tabName];
    const paginatedProjects = paginate(projects, currentPage);

    return (
      <>
        {paginatedProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => navigate(`/recipe/${project.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#fff",
              marginBottom: "8px",
            }}
          >
            {project.image_url && (
              <img
                src={`http://localhost:8000${project.image_url}`}
                alt={project.title}
                style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px" }}
              />
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>{project.title}</p>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                {project.type === "PROJECT" ? "프로젝트" : "스터디"} · {project.field || "분야 미정"}
              </p>
            </div>
          </div>
        ))}

        <Pagination
          currentPage={currentPage}
          totalItems={projects.length}
          onPageChange={(newPage) => {
            setProjectPages(prev => ({ ...prev, [tabName]: newPage }));
          }}
        />
      </>
    );
  };

  const renderPostList = () => {
    if (myPosts.length === 0) {
      return (
        <div style={{ width: "100%", textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af" }}>
          작성한 게시글이 없습니다
        </div>
      );
    }

    const currentPage = postPages.posts;
    const paginatedPosts = paginate(myPosts, currentPage);

    return (
      <>
        {paginatedPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/board/${post.id}`)}
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#fff",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{
                fontSize: "11px",
                color: "#6b7280",
                background: "#f3f4f6",
                padding: "2px 8px",
                borderRadius: "4px"
              }}>
                {post.category || "일반"}
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>{post.title}</p>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#6b7280" }}>
              <span>👁️ {post.view_count || 0}</span>
              <span>❤️ {post.like_count || 0}</span>
              <span>💬 {post.comment_count || 0}</span>
            </div>
          </div>
        ))}

        <Pagination
          currentPage={currentPage}
          totalItems={myPosts.length}
          onPageChange={(newPage) => {
            setPostPages(prev => ({ ...prev, posts: newPage }));
          }}
        />
      </>
    );
  };

  const renderCommentList = () => {
    if (myComments.length === 0) {
      return (
        <div style={{ width: "100%", textAlign: "center", padding: "24px", background: "#f9fafb", borderRadius: "8px", color: "#9ca3af" }}>
          작성한 댓글이 없습니다
        </div>
      );
    }

    const currentPage = postPages.comments;
    const paginatedComments = paginate(myComments, currentPage);

    return (
      <>
        {paginatedComments.map((comment) => (
          <div
            key={comment.id}
            onClick={() => navigate(`/board/${comment.board_post_id}`)}
            style={{
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#fff",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "500", color: "#3b82f6" }}>
                {comment.post_title || "게시글"}
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#374151" }}>
              {comment.content.length > 100
                ? `${comment.content.substring(0, 100)}...`
                : comment.content}
            </p>
          </div>
        ))}

        <Pagination
          currentPage={currentPage}
          totalItems={myComments.length}
          onPageChange={(newPage) => {
            setPostPages(prev => ({ ...prev, comments: newPage }));
          }}
        />
      </>
    );
  };

  if (!profile) return <div style={{ textAlign: "center", marginTop: "40px" }}>로딩 중...</div>;

  const isMyProfile = currentUser && currentUser.id === profile.id;
  const isAdmin = currentUser?.role === "ADMIN";

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
                  ? `http://localhost:8000${profile.profile_image}`
                  : "http://localhost:8000/assets/profile/default_profile.png"
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

        {/* ✅ 생년월일 (본인/관리자는 항상 보임, 다른 사람은 공개 설정에 따라) */}
        {profile.birth_date && (isMyProfile || isAdmin || profile.visibility?.birth_date) && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500" }}>
                생년월일
              </label>
              {/* ✅ 본인 또는 관리자에게만 비공개 뱃지 표시 */}
              {(isMyProfile || isAdmin) && !profile.visibility?.birth_date && (
                <span style={{
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: "4px",
                }}>
                  🔒 비공개
                </span>
              )}
            </div>
            <div
              style={{
                width: "106%",
                padding: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#fafafa",
                boxSizing: "border-box",
              }}
            >
              {new Date(profile.birth_date).toLocaleDateString("ko-KR")}
            </div>
          </div>
        )}

        {/* ✅ 성별 (본인/관리자는 항상 보임, 다른 사람은 공개 설정에 따라) */}
        {profile.gender && (isMyProfile || isAdmin || profile.visibility?.gender) && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500" }}>
                성별
              </label>
              {/* ✅ 본인 또는 관리자에게만 비공개 뱃지 표시 */}
              {(isMyProfile || isAdmin) && !profile.visibility?.gender && (
                <span style={{
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: "4px",
                }}>
                  🔒 비공개
                </span>
              )}
            </div>
            <div
              style={{
                width: "106%",
                padding: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#fafafa",
                boxSizing: "border-box",
              }}
            >
              {profile.gender === "MALE"
                ? "남성"
                : profile.gender === "FEMALE"
                  ? "여성"
                  : profile.gender}
            </div>
          </div>
        )}

        {/* ✅ 자기소개 (항상 공개) */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자기소개
          </label>
          <div style={{
            width: "100%",
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

        {/* ✅ 이력 (항상 공개) */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            이력
          </label>
          <div style={{
            width: "100%",
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

        {/* ✅ 자격증 (항상 공개) */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
            자격증
          </label>
          <div style={{
            width: "100%",
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
            width: "100%",
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

        {/* ✅ 프로젝트 섹션 */}
        <div style={{ width: "100%", marginBottom: "40px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "12px" }}>
            프로젝트
          </label>

          <div style={{ width: "100%", display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
            <button
              onClick={() => handleProjectTabChange("ongoing")}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                background: activeTab === "ongoing" ? "#3b82f6" : "transparent",
                color: activeTab === "ongoing" ? "#fff" : "#6b7280",
                border: "none",
                borderBottom: activeTab === "ongoing" ? "2px solid #3b82f6" : "none",
                cursor: "pointer",
                fontWeight: activeTab === "ongoing" ? "500" : "normal",
              }}
            >
              진행중 ({ongoingProjects.length})
            </button>
            <button
              onClick={() => handleProjectTabChange("pending")}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                background: activeTab === "pending" ? "#3b82f6" : "transparent",
                color: activeTab === "pending" ? "#fff" : "#6b7280",
                border: "none",
                borderBottom: activeTab === "pending" ? "2px solid #3b82f6" : "none",
                cursor: "pointer",
                fontWeight: activeTab === "pending" ? "500" : "normal",
              }}
            >
              대기중 ({pendingProjects.length})
            </button>
            <button
              onClick={() => handleProjectTabChange("ended")}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                background: activeTab === "ended" ? "#3b82f6" : "transparent",
                color: activeTab === "ended" ? "#fff" : "#6b7280",
                border: "none",
                borderBottom: activeTab === "ended" ? "2px solid #3b82f6" : "none",
                cursor: "pointer",
                fontWeight: activeTab === "ended" ? "500" : "normal",
              }}
            >
              종료 ({endedProjects.length})
            </button>
          </div>

          <div>
            {activeTab === "ongoing" && renderProjectList(ongoingProjects, "ongoing")}
            {activeTab === "pending" && renderProjectList(pendingProjects, "pending")}
            {activeTab === "ended" && renderProjectList(endedProjects, "ended")}
          </div>
        </div>

        {/* ✅ 활동 내역 섹션 */}
        <div style={{ marginBottom: "40px" }}>
          <label style={{ width: "100%", display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "12px" }}>
            활동 내역
          </label>

          <div style={{ width: "100%", display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
            <button
              onClick={() => handlePostTabChange("posts")}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                background: postTab === "posts" ? "#3b82f6" : "transparent",
                color: postTab === "posts" ? "#fff" : "#6b7280",
                border: "none",
                borderBottom: postTab === "posts" ? "2px solid #3b82f6" : "none",
                cursor: "pointer",
                fontWeight: postTab === "posts" ? "500" : "normal",
              }}
            >
              게시글 ({myPosts.length})
            </button>

            {(isMyProfile || isAdmin) && (
              <button
                onClick={() => handlePostTabChange("comments")}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  background: postTab === "comments" ? "#3b82f6" : "transparent",
                  color: postTab === "comments" ? "#fff" : "#6b7280",
                  border: "none",
                  borderBottom: postTab === "comments" ? "2px solid #3b82f6" : "none",
                  cursor: "pointer",
                  fontWeight: postTab === "comments" ? "500" : "normal",
                }}
              >
                댓글 ({myComments.length})
              </button>
            )}
          </div>

          <div>
            {postTab === "posts" && renderPostList()}
            {postTab === "comments" && (isMyProfile || isAdmin) && renderCommentList()}
          </div>
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
                          user.profile_image
                            ? `http://localhost:8000${user.profile_image}`
                            : "http://localhost:8000/assets/profile/default_profile.png"
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
  );
}