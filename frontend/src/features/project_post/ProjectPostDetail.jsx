import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch, getCurrentUser } from "../auth/api";
import ApplicationModal from "./ApplicationModal";

export default function ProjectPostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ✅ 게시글 상세 + 로그인 사용자 정보 불러오기
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await authFetch(`/recipe/${postId}`, { method: "GET" }, { skipRedirect: true });
        setPost(res);
      } catch (err) {
        console.error("❌ 상세 불러오기 실패:", err);
      }
    }

    async function fetchUser() {
      try {
        const res = await getCurrentUser({ skipRedirect: true }); // 로그인 안 되어 있으면 null
        setCurrentUser(res);
      } catch {
        setCurrentUser(null); // 비로그인 시 null
      }
    }

    fetchPost();
    fetchUser();
  }, [postId]);

  // ✅ 탈퇴하기
  const handleLeave = async () => {
    try {
      await authFetch(`/recipe/${postId}/leave`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      alert("✅ 탈퇴 완료");
      window.location.reload();
    } catch (err) {
      alert("❌ 탈퇴 실패: " + err.message);
    }
  };

  // ✅ 게시글 삭제
  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await authFetch(`/recipe/${postId}`, { method: "DELETE" });
      alert("✅ 삭제 완료");
      navigate("/posts");
    } catch (err) {
      alert("❌ 삭제 실패: " + err.message);
    }
  };

  if (!post) return <p>로딩 중...</p>;

  const isLeader = currentUser && currentUser.id === post.leader_id;
  const isMember =
    currentUser && post.members?.some((m) => m.user_id === currentUser.id);

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
              src={`http://localhost:8000${post.image_url}`}
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
            <h2 style={{ margin: "0 0 10px 0" }}>{post.title}</h2>
            <p style={{ margin: "0 0 8px 0", color: "#555" }}>
              모집 인원 {post.current_members}/{post.capacity}명 | {post.type}
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#777" }}>
              모집 기간 {post.start_date} ~ {post.end_date}
            </p>
          </div>
        </div>

        {/* 오른쪽: 프로젝트 리더 */}
        <div style={{ textAlign: "right" }}>
          <h4>프로젝트 리더</h4>
          <div>
            <strong>리더 ID: {post.leader_id}</strong>
          </div>

          {/* ✅ 리더만 보이는 수정/삭제 버튼 */}
          {isLeader && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => navigate(`/recipe/${post.id}/edit`)}
                style={{ marginRight: "10px" }}
              >
                수정하기
              </button>
              <button onClick={handleDelete}>삭제하기</button>
            </div>
          )}
        </div>
      </div>

      <hr style={{ margin: "2rem 0" }} />

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

        {/* ✅ 신청/탈퇴 버튼 (리더 제외, 로그인한 경우에만 보임) */}
        {!isLeader && currentUser && (
          <div>
            {!isMember ? (
              <button
                onClick={() => setShowModal(true)} // ✅ 신청하기 → 모달 열기
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
            ) : (
              <button
                onClick={handleLeave} // ✅ 이미 멤버면 탈퇴하기
                style={{
                  padding: "10px 20px",
                  border: "1px solid #333",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                탈퇴하기
              </button>
            )}
          </div>
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
