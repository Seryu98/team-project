// /src/features/project_post/ProjectPostDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch, getCurrentUser } from "../auth/api";
import ApplicationModal from "./ApplicationModal";
import { submitReport } from "../../shared/api/reportApi";

// ✅ 환경변수 기반 API 기본 URL 추가
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function ProjectPostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaderInfo, setLeaderInfo] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // ✅ 멤버 제외 함수
  const handleKickMember = async (userId) => {
    if (!window.confirm("정말 이 멤버를 제외하시겠습니까?")) return;
    try {
      await authFetch(`/recipe/${postId}/kick/${userId}`, { method: "POST" });
      alert("✅ 멤버가 제외되었습니다.");

      // 최신 데이터 다시 불러오기
      const updated = await authFetch(`/recipe/${postId}`, { method: "GET" });
      setPost(updated);
    } catch (err) {
      alert("❌ 제외 실패: " + err.message);
    }
  };


  // ✅ 게시글 상세 + 로그인 사용자 정보 + 리더 정보 불러오기
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await authFetch(
          `/recipe/${postId}`,
          { method: "GET" },
          { skipRedirect: true }
        );
        setPost(res);

        // ✅ 리더 정보 별도 조회
        if (res.leader_id) {
          try {
            const leader = await authFetch(
              `/profiles/${res.leader_id}`,
              { method: "GET" },
              { skipRedirect: true }
            );
            setLeaderInfo(leader);
          } catch (err) {
            console.error("❌ 리더 정보 불러오기 실패:", err);
            setLeaderInfo(null);
          }
        }
      } catch (err) {
        console.error("❌ 상세 불러오기 실패:", err);
      }
    }

    async function fetchUser() {
      try {
        const res = await getCurrentUser({ skipRedirect: true });
        setCurrentUser(res);
      } catch {
        setCurrentUser(null);
      }
    }

    fetchPost();
    fetchUser();
  }, [postId]);

  // ✅ 드롭다운 외부 클릭 시 자동 닫기
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown(null);

    // 클릭 이벤트 등록
    window.addEventListener("click", handleOutsideClick);

    // 언마운트 시 이벤트 해제 (중복 방지)
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);


  // ✅ 탈퇴하기
  const handleLeave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authFetch(`/recipe/${postId}/leave`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      alert("✅ 탈퇴 완료");
      navigate("/posts");
    } catch (err) {
      alert("❌ 탈퇴 실패: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // ✅ 게시글 삭제
  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    if (busy) return;
    setBusy(true);
    try {
      await authFetch(`/recipe/${postId}`, { method: "DELETE" });
      alert("✅ 삭제 완료");
      navigate("/posts");
    } catch (err) {
      alert("❌ 삭제 실패: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // ✅ 모집 상태 변경
  const updateRecruitStatus = async (status) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await authFetch(`/recipe/${postId}/recruit-status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      alert(`✅ 모집 상태가 ${status}로 변경되었습니다.`);
      // ✅ 응답으로 바로 갱신 (GET 생략 가능)
      setPost(res);
    } catch (err) {
      alert("❌ 상태 변경 실패: " + err.message);
    } finally {
      setBusy(false);
    }
  };


  // ✅ 프로젝트 종료 → 게시판 이동
  const endProject = async () => {
    if (!window.confirm("정말 프로젝트를 종료하시겠습니까?")) return;
    if (busy) return;
    setBusy(true);
    try {
      await authFetch(`/recipe/${postId}/end`, { method: "POST" });
      alert("✅ 프로젝트가 종료되었습니다.");
      navigate("/posts");
    } catch (err) {
      alert("❌ 종료 실패: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!post) return <p>로딩 중...</p>;

  const isLeader = currentUser && currentUser.id === post.leader_id;
  const isMember =
    currentUser && post.members?.some((m) => m.user_id === currentUser.id);

  const workLabelPrefix = post.type === "STUDY" ? "스터디" : "프로젝트";
  const ended = post.project_status === "ENDED";

  // ✅ 디버깅 로그
  console.log("🧩 currentUser:", currentUser);
  console.log("🧩 post.members:", post.members);
  console.log("🧩 isLeader:", isLeader);
  console.log("🧩 isMember:", isMember);

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "2rem" }}>
      {/* 제목 */}
      <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
        프로젝트 / 스터디 상세
      </h2>

      {/* 상단 대표 영역 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        {/* 왼쪽: 이미지 + 제목/인원/기간 */}
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {post.image_url && (
            <img
              src={
                post.image_url.startsWith("http")
                  ? post.image_url // ✅ 이미 절대경로면 그대로 사용
                  : `${API_URL}${post.image_url.startsWith("/")
                    ? post.image_url
                    : "/" + post.image_url
                  }`
              }
              alt="대표 이미지"
              style={{
                width: "200px",
                height: "200px",
                objectFit: "cover",
                borderRadius: "8px",
                marginRight: "20px",
              }}
            />
          )}

          <div>
            <h2 style={{ margin: "0 0 10px 0" }}>
              {post.title}{" "}
              {ended && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "#eee",
                    border: "1px solid #ccc",
                  }}
                >
                  종료됨
                </span>
              )}
              {post.status !== "APPROVED" && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "#ffeeba",
                    border: "1px solid #f0ad4e",
                  }}
                >
                  승인 대기중
                </span>
              )}
            </h2>
            <p style={{ margin: "0 0 8px 0", color: "#555" }}>
              모집 인원 {post.current_members}/{post.capacity}명 | {post.type}
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#777" }}>
              모집 기간 {post.start_date} ~ {post.end_date}
            </p>
            {post.project_start && post.project_end && (
              <p style={{ margin: 0, fontSize: "14px", color: "#777" }}>
                {workLabelPrefix} 기간 {post.project_start} ~ {post.project_end}
              </p>
            )}
          </div>
        </div>
        {/* 오른쪽: 프로젝트 리더 */}
        <div style={{ textAlign: "right" }}>
          <h4>프로젝트 리더</h4>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              marginBottom: "15px"
            }}
          >
            <img
              src={
                leaderInfo?.profile_image
                  ? `${API_URL}${leaderInfo.profile_image}` // ✅ 수정됨
                  : `${API_URL}/assets/profile/default_profile.png`
              }
              alt="리더 프로필"
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                objectFit: "cover",
                cursor: "pointer",
                border: "3px solid #ddd",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
              onClick={() => navigate(`/profile/${post.leader_id}`)}
            />
            <span
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "18px",
                color: "#333",
              }}
              onClick={() => navigate(`/profile/${post.leader_id}`)}
            >
              {leaderInfo?.nickname || "로딩 중..."}
            </span>
          </div>

          {/* 🚨 게시글 신고 버튼 (작성자가 아닐 때만 표시) */}
          {currentUser && currentUser.id !== post.leader_id && (
            <button
              onClick={async () => {
                const reason = prompt("신고 사유를 입력해주세요:");
                if (!reason || !reason.trim()) return alert("신고 사유를 입력해야 합니다.");
                try {
                  await submitReport("POST", post.id, reason);
                  alert("🚨 게시글 신고가 접수되었습니다.");
                } catch (err) {
                  console.error("❌ 게시글 신고 실패:", err);
                  alert("신고 중 오류가 발생했습니다.");
                }
              }}
              style={{
                marginTop: "8px",
                padding: "6px 10px",
                background: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              🚨 게시글 신고
            </button>
          )}

          {/* ✅ 리더만 보이는 버튼 */}
          {isLeader && !ended && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => navigate(`/recipe/${post.id}/edit`)} // ✅ 수정 페이지 이동
                style={{ marginRight: "10px" }}
                disabled={busy}
              >
                수정하기
              </button>
              <button
                onClick={handleDelete}
                style={{ marginRight: "10px" }}
                disabled={busy}
              >
                삭제하기
              </button>

              {/* 승인된 경우에만 모집/종료 제어 가능 */}
              {post.status === "APPROVED" && (
                <>
                  {post.recruit_status === "OPEN" && (
                    <button
                      onClick={() => updateRecruitStatus("CLOSED")}
                      disabled={busy}
                    >
                      모집 종료
                    </button>
                  )}
                  {post.recruit_status === "CLOSED" && (
                    <>
                      <button
                        onClick={() => updateRecruitStatus("OPEN")}
                        style={{ marginRight: "10px" }}
                        disabled={busy}
                      >
                        모집 재개
                      </button>
                      <button onClick={endProject} disabled={busy}>
                        프로젝트 종료
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <hr style={{ margin: "2rem 0" }} />

      {/* 참여 중인 유저 섹션 */}
      {post.members && post.members.length > 0 && (
        <section
          style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "1px solid #ddd",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
            참여 중인 유저
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            {post.members.map((member) => (
              <div
                key={member.user_id}
                style={{
                  width: "140px",
                  textAlign: "center",
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                  padding: "14px",
                  position: "relative",
                }}
              >
                {/* 프로필 이미지 */}
                <img
                  src={
                    member.profile_image
                      ? member.profile_image.startsWith("http")
                        ? member.profile_image // 절대경로면 그대로 사용
                        : member.profile_image.startsWith("/")
                          ? `${API_URL}${member.profile_image}` // ✅ 수정됨
                          : `${API_URL}/${member.profile_image}`
                      : `${API_URL}/assets/profile/default_profile.png` // ✅ 수정됨
                  }
                  alt={member.nickname}
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                    border: member.user_id === post.leader_id ? "2px solid #007bff" : "1px solid #ccc",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === member.user_id ? null : member.user_id);
                  }}
                />

                {/* 닉네임 + 리더 표시 */}
                <p
                  style={{
                    marginTop: "8px",
                    fontWeight: "600",
                    color: member.user_id === post.leader_id ? "#007bff" : "#333",
                    fontSize: "14px",
                  }}
                >
                  {member.user_id === post.leader_id
                    ? `${member.nickname} (리더)`
                    : member.nickname}
                </p>
                {/* 드롭다운 */}
                {activeDropdown === member.user_id && (
                  <div
                    style={{
                      position: "absolute",
                      top: "95px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      zIndex: 10,
                      width: "120px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 0",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                      onClick={() => navigate(`/profile/${member.user_id}`)}
                    >
                      프로필 보기
                    </button>

                    {/* 리더일 경우에만 ‘제외하기’ 버튼 */}
                    {isLeader && member.user_id !== post.leader_id && (
                      <button
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 0",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "red",
                        }}
                        onClick={() => handleKickMember(member.user_id)}
                      >
                        제외하기
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 분야 */}
      {post.field && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4>분야</h4>
          <p style={{ fontSize: "15px", color: "#444" }}>{post.field}</p>
        </div>
      )}

      {/* 기술 스택 */}
      <div>
        <h4>언어 / 기술</h4>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {post.skills?.map((s) => (
            <span
              key={s.id}
              style={{
                background: "#f0f0f0",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "13px",
              }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* 설명 */}
      <div style={{ marginTop: "2rem" }}>
        <h4>프로젝트 / 스터디 설명</h4>
        <p>{post.description}</p>
      </div>

      {/* 필수 입력값 + 신청 버튼 */}
      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h4>지원자 필수 입력값</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {post.application_fields?.map((f) => (
              <span
                key={f.id}
                style={{
                  background: "#ddd",
                  padding: "5px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                {f.name}
              </span>
            ))}
          </div>
        </div>

        {/* ✅ 신청/탈퇴 버튼 (프로젝트 종료 시만 숨김, 모집 종료여도 멤버 탈퇴 가능) */}
        {currentUser ? (
          !isLeader &&
          post.status === "APPROVED" &&
          !ended && (
            <div>
              {/* ✅ 모집 중일 때만 신청 버튼 표시 */}
              {!isMember && post.recruit_status === "OPEN" ? (
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    marginRight: "10px",
                    padding: "10px 20px",
                    background: "#333",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  신청하기
                </button>
              ) : null}

              {/* ✅ 멤버인 경우에는 모집 상태가 CLOSED여도 탈퇴 버튼 표시 */}
              {isMember && (
                <button
                  onClick={handleLeave}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid #333",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                  disabled={busy}
                >
                  탈퇴하기
                </button>
              )}
            </div>
          )
        ) : (
          <p style={{ fontSize: "13px", color: "#aaa" }}>로그인 정보 불러오는 중...</p>
        )}
      </div>

      {/* ✅ 지원서 모달 */}
      {showModal && (
        <ApplicationModal
          postId={post.id}
          fields={post.application_fields}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
