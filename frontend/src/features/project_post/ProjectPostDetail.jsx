//  frontend/src/feature/project_post/ProjectPostDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ProjectPostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // ✅ 로그인한 유저 정보 저장

  // ✅ 게시글 상세 불러오기
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await axios.get(`http://localhost:8000/recipe/${postId}`);
        setPost(res.data);
      } catch (err) {
        console.error("❌ 상세 불러오기 실패:", err);
      }
    }

    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(res.data);
      } catch (err) {
        console.warn("⚠ 로그인 사용자 불러오기 실패:", err);
      }
    }

    fetchPost();
    fetchUser();
  }, [postId]);

  // ✅ 참여하기
  const handleJoin = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:8000/recipe/${postId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 참여 완료");
      window.location.reload();
    } catch (err) {
      alert("❌ 참여 실패: " + (err.response?.data?.detail || err.message));
    }
  };

  // ✅ 탈퇴하기
  const handleLeave = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:8000/recipe/${postId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ 탈퇴 완료");
      window.location.reload();
    } catch (err) {
      alert("❌ 탈퇴 실패: " + (err.response?.data?.detail || err.message));
    }
  };

  // ✅ 게시글 삭제
  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:8000/recipe/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ 삭제 완료");
      navigate("/list"); // 삭제 후 게시판으로 이동
    } catch (err) {
      alert("❌ 삭제 실패: " + (err.response?.data?.detail || err.message));
    }
  };

  if (!post) return <p>로딩 중...</p>;

  // ✅ 리더 여부 판별
  const isLeader = currentUser && currentUser.id === post.leader_id;

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "1rem" }}>
      <h2>{post.title}</h2>

      {/* 대표 이미지 */}
      {post.image_url && (
        <img
          src={`http://localhost:8000${post.image_url}`}
          alt="대표 이미지"
          style={{ width: "100%", borderRadius: "8px", marginBottom: "1rem" }}
        />
      )}

      <p>{post.description}</p>
      <p>
        모집인원 {post.current_members}/{post.capacity}명 | {post.type}
      </p>
      <p>
        모집기간 {post.start_date} ~ {post.end_date}
      </p>

      {/* ✅ 사용 언어 */}
      <div style={{ marginTop: "0.5rem" }}>
        {post.skills?.map((s) => (
          <span
            key={s.id}
            style={{
              display: "inline-block",
              margin: "2px",
              padding: "3px 8px",
              border: "1px solid #333",
              borderRadius: "5px",
              background: "#f0f0f0",
              fontSize: "12px",
            }}
          >
            {s.name}
          </span>
        ))}
      </div>

      {/* ✅ 버튼 영역 */}
      <div style={{ marginTop: "1rem" }}>
        {isLeader ? (
          <>
            <button
              onClick={() => navigate(`/recipe/${post.id}/edit`)}
              style={{ marginRight: "10px" }}
            >
              수정하기
            </button>
            <button onClick={handleDelete}>삭제하기</button>
          </>
        ) : (
          <>
            <button onClick={handleJoin} style={{ marginRight: "10px" }}>
              참여하기
            </button>
            <button onClick={handleLeave}>탈퇴하기</button>
          </>
        )}
      </div>
    </div>
  );
}
