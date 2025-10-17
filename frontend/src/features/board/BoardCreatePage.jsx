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
    attachment_url: "",
  });

  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "project");

    try {
      setUploading(true);
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("업로드 실패");
      const data = await res.json();
      setForm((prev) => ({ ...prev, attachment_url: data.url }));
      setPreview(`http://localhost:8000${data.url}`);
    } catch (err) {
      alert("이미지 업로드 실패: " + err.message);
    } finally {
      setUploading(false);
    }
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
    <div className="board-create-wrapper">
      <h2 className="create-title">📝 새 게시글 작성</h2>

      <form className="board-create-form" onSubmit={handleSubmit}>
        {/* 제목 */}
        <div className="form-group">
          <label>제목 *</label>
          <input
            className="form-input"
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="제목을 입력하세요"
            required
          />
        </div>

        {/* 카테고리 */}
        <div className="form-group">
          <label>카테고리 *</label>
          <select
            className="form-select"
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            required
          >
            <option value="">선택하세요</option>
            <option value="1">홍보글</option>
            <option value="2">잡담글</option>
            <option value="3">자랑글</option>
            <option value="4">질문&답변</option>
            <option value="5">정보공유</option>
          </select>
        </div>

        {/* 대표 이미지 */}
        <div className="form-group">
          <label>대표 이미지 (선택)</label>
          <input
            className="form-input"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          {preview && (
            <div className="image-preview-box">
              <img src={preview} alt="미리보기" className="image-preview" />
              {uploading && <p className="uploading-text">업로드 중...</p>}
            </div>
          )}
        </div>

        {/* 내용 */}
        <div className="form-group">
          <label>내용 *</label>
          <textarea
            className="form-textarea"
            name="content"
            value={form.content}
            onChange={handleChange}
            placeholder="내용을 입력하세요"
            required
          />
        </div>

        {/* 버튼 */}
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
  );
}
