// frontend/src/features/board/BoardEditPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBoardPostDetail, updateBoardPost } from "./BoardAPI";
import RichTextEditor from "../../components/RichTextEditor";
import "./Board.css";

export default function BoardEditPage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    content: "",
    attachment_url: "",
  });

  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────
  // 게시글 불러오기
  // ──────────────────────────────
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await getBoardPostDetail(postId);
        if (res.post) {
          setForm({
            title: res.post.title,
            category_id: res.post.category_id,
            content: res.post.content,
            attachment_url: res.post.attachment_url,  // ✅ 항상 기본 이미지든 업로드 이미지든 값 있음
          });

          // ✅ preview는 무조건 보여줌
          setPreview(`http://localhost:8000${res.post.attachment_url}`);
        }

      } catch {
        alert("게시글 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  // ──────────────────────────────
  // 입력 변경
  // ──────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ──────────────────────────────
  // 이미지 업로드
  // ──────────────────────────────
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

  // ──────────────────────────────
  // 수정 제출
  // ──────────────────────────────
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
    <div className="board-create-wrapper">
      <h2 className="create-title">✏️ 게시글 수정</h2>

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
          <RichTextEditor
            value={form.content}
            onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
          />
        </div>


        {/* 버튼 */}
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
  );
}
