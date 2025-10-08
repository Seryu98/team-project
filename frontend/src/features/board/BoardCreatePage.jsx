// frontend/src/features/board/BoardCreatePage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBoardPost } from "./BoardAPI";
import "./Board.css";

export default function BoardCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    content: "",
  });

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
      const res = await createBoardPost(form);
      if (res.success) {
        alert("게시글이 등록되었습니다.");
        navigate(`/board/${res.post_id}`);
      }
    } catch (err) {
      alert("등록 실패: " + err.message);
    }
  };

  return (
    <div className="board-detail-container">
      <div className="board-detail-card">
        <h2 className="detail-title">📝 새 게시글 작성</h2>

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
              onClick={() => navigate("/board")}
            >
              취소
            </button>
            <button type="submit" className="submit-btn">
              등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
