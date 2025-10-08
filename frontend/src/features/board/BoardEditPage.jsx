// frontend/src/features/board/BoardEditPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBoardPostDetail, updateBoardPost } from "./BoardAPI";
import "./Board.css";

export default function BoardEditPage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    content: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await getBoardPostDetail(postId);
        if (res.post) {
          setForm({
            title: res.post.title,
            category_id: res.post.category_id,
            content: res.post.content,
          });
        }
      } catch {
        alert("게시글 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      const res = await updateBoardPost(postId, form);
      if (res.success) {
        alert("게시글이 수정되었습니다.");
        navigate(`/board/${postId}`);
      }
    } catch (err) {
      alert("수정 실패: " + err.message);
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>로딩 중...</p>;

  return (
    <div className="board-detail-container">
      <div className="board-detail-card">
        <h2 className="detail-title">✏️ 게시글 수정</h2>

        <form className="board-form" onSubmit={handleSubmit}>
          <label className="form-label">
            제목
            <input
              className="form-input"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
            />
          </label>

          <label className="form-label">
            카테고리
            <select
              className="form-select"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
            >
              <option value="">선택하세요</option>
              <option value="1">홍보글</option>
              <option value="2">잡담글</option>
              <option value="3">자랑글</option>
              <option value="4">질문&답변</option>
              <option value="5">정보공유</option>
            </select>
          </label>

          <label className="form-label">
            내용
            <textarea
              className="form-textarea"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="내용을 입력하세요"
            />
          </label>

          <div className="form-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate(`/board/${postId}`)}
            >
              취소
            </button>
            <button type="submit" className="submit-btn">
              수정 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
