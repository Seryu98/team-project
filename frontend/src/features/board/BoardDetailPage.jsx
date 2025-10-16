// frontend/src/features/board/BoardDetailPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getBoardPostDetail,
  toggleBoardLike,
  deleteBoardPost,
  createBoardComment,
  deleteBoardComment,
  updateBoardComment,
} from "./BoardAPI";
import { getCurrentUser } from "../auth/api";
import "./Board.css";
import { submitReport } from "../../shared/api/reportApi";

export default function BoardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyMap, setReplyMap] = useState({});
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const isLoggedIn = !!currentUser;

  // ===============================
  // 유저 정보 가져오기
  // ===============================
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getCurrentUser({ skipRedirect: true });
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
    }
    fetchUser();
  }, []);

  // ===============================
  // 게시글 + 댓글 조회
  // ===============================
  async function fetchPost() {
    try {
      const res = await getBoardPostDetail(id);
      setPost(res.post);
      setComments(res.comments || []);
    } catch (err) {
      console.error("❌ 게시글 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPost();
  }, [id]);

  // ===============================
  // 좋아요
  // ===============================
  const handleLike = async () => {
    try {
      const res = await toggleBoardLike(post.id);
      if (res?.success === false || res?.message || res?.detail) {
        const msg =
          res?.message || res?.detail || "본인이 작성한 글에는 좋아요를 누를 수 없습니다.";
        alert(msg);
        return;
      }
      if (res?.success && typeof res.like_count === "number") {
        setPost((prev) => ({ ...prev, like_count: res.like_count }));
      }
    } catch {
      alert("좋아요 처리 중 오류 발생");
    }
  };

  // ===============================
  // 게시글 삭제
  // ===============================
  const handleDelete = async () => {
    if (!window.confirm("이 게시글을 삭제하시겠습니까?")) return;
    try {
      const res = await deleteBoardPost(id);
      if (res.success) {
        alert("삭제되었습니다.");
        navigate("/board", { state: { refresh: true } });
      }
    } catch {
      alert("삭제 실패");
    }
  };

  // ===============================
  // 댓글 등록
  // ===============================
  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await createBoardComment(id, { content: newComment });
      if (res.success) {
        await fetchPost();
        setNewComment("");
      }
    } catch {
      alert("댓글 등록 실패");
    }
  };

  // ===============================
  // 대댓글 등록
  // ===============================
  const handleAddReply = async (parentId) => {
    const content = replyMap[parentId];
    if (!content?.trim()) return;
    try {
      const res = await createBoardComment(id, { content, parent_id: parentId });
      if (res.success) {
        await fetchPost();
        setReplyMap((prev) => {
          const updated = { ...prev };
          delete updated[parentId];
          return updated;
        });
      }
    } catch {
      alert("대댓글 등록 실패");
    }
  };

  // ===============================
  // 댓글 삭제
  // ===============================
  const handleCommentDelete = async (cid) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      const res = await deleteBoardComment(cid);
      if (res.success) await fetchPost();
    } catch {
      alert("댓글 삭제 실패");
    }
  };

  // ===============================
  // 댓글 수정
  // ===============================
  const startEdit = (id, content) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleEditSubmit = async (cid) => {
    if (!editContent.trim()) return;
    try {
      const res = await updateBoardComment(cid, { content: editContent });
      if (res.success) {
        alert("수정이 완료되었습니다.");
        setEditingId(null);
        setEditContent("");
        await fetchPost();
      } else {
        alert("댓글 수정 실패");
      }
    } catch {
      alert("댓글 수정 실패");
    }
  };

  // ===============================
  // 렌더링 보조
  // ===============================
  if (loading) return <p>로딩 중...</p>;
  if (!post) return <p>게시글을 찾을 수 없습니다.</p>;

  const isOwner = currentUser && post.author.id === currentUser.id;

  // ✅ 댓글 수 계산 (삭제 제외)
  const visibleCommentCount = comments.reduce((sum, thread) => {
    const c = thread.comment;
    const replies = thread.replies || [];
    const validReplies = replies.filter((r) => r.status !== "DELETED").length;
    return sum + (c.status !== "DELETED" ? 1 : 0) + validReplies;
  }, 0);

  // ✅ 권한별 버튼 렌더
const renderButtons = (item, isMine) => {
  // 게시글 작성자가 본인일 때
  if (isOwner) {
    return (
      <>
        {isMine && (
          <button className="edit-btn" onClick={() => startEdit(item.id, item.content)}>
            수정
          </button>
        )}
        <button className="delete-btn" onClick={() => handleCommentDelete(item.id)}>
          삭제
        </button>
        {!isMine && (
          <button
            className="report-btn"
            onClick={async () => {
              const reason = prompt("신고 사유를 입력해주세요:");
              if (!reason || !reason.trim()) return alert("신고 사유를 입력해야 합니다.");
              try {
                await submitReport("COMMENT", item.id, reason);
                alert("🚨 댓글 신고가 접수되었습니다.");
              } catch (err) {
                console.error("❌ 댓글 신고 실패:", err);
                alert("신고 중 오류가 발생했습니다.");
              }
            }}
          >
            🚨 신고
          </button>
        )}
      </>
    );
  }

  // 댓글 작성자가 본인일 때
  if (isMine) {
    return (
      <>
        <button className="edit-btn" onClick={() => startEdit(item.id, item.content)}>
          수정
        </button>
        <button className="delete-btn" onClick={() => handleCommentDelete(item.id)}>
          삭제
        </button>
      </>
    );
  }

  // ✅ 신고 버튼 추가 (기존 댓글 주인 아닌 사용자)
  return (
    <button
      className="report-btn"
      onClick={async () => {
        const reason = prompt("신고 사유를 입력해주세요:");
        if (!reason || !reason.trim()) return alert("신고 사유를 입력해야 합니다.");
        try {
          await submitReport("COMMENT", item.id, reason);
          alert("🚨 댓글 신고가 접수되었습니다.");
        } catch (err) {
          console.error("❌ 댓글 신고 실패:", err);
          alert("신고 중 오류가 발생했습니다.");
        }
      }}
    >
      🚨 신고
    </button>
  );
};
  // ===============================
  // ✅ 화면 렌더링
  // ===============================
  return (
    <div className="board-detail-container">
      <button className="back-btn" onClick={() => navigate("/board", { state: { refresh: true } })}>
        ← 목록으로
      </button>

      <div className="board-detail-card">
        <div className="detail-header">
          <div className="author-box">
            <img
              src={post.author.profile_image || "/default_profile.png"}
              alt="프로필"
              className="profile-thumb"
              onClick={() => navigate(`/profile/${post.author.id}`)}
            />
            <span
              className="nickname"
              onClick={() => navigate(`/profile/${post.author.id}`)}
            >
              {post.author.nickname}
            </span>
          </div>
          <span className="detail-date">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>

        <h2 className="detail-title">{post.title}</h2>

        <div className="detail-actions">
          <span>👁 {post.view_count}</span>
          {isLoggedIn && <button onClick={handleLike}>❤️ {post.like_count}</button>}
          <span>💬 댓글({visibleCommentCount})</span>
        </div>

        <div className="detail-content">{post.content}</div>

        {isOwner && (
          <div className="post-owner-actions">
            <button className="edit-btn" onClick={() => navigate(`/board/${post.id}/edit`)}>
              수정
            </button>
            <button className="delete-btn" onClick={handleDelete}>
              삭제
            </button>
          </div>
        )}

        <hr />

        <div className="comments-section">
          <h3>💬 댓글 ({visibleCommentCount})</h3>

          {isLoggedIn ? (
            <div className="comment-input">
              <textarea
                placeholder="댓글을 입력하세요"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button onClick={handleCommentSubmit}>등록</button>
            </div>
          ) : (
            <p>💡 로그인 후 댓글을 작성할 수 있습니다.</p>
          )}

          {/* =============================== */}
          {/* 댓글 / 대댓글 리스트 */}
          {/* =============================== */}
          {comments.map((thread) => {
            const c = thread.comment;
            const replies = thread.replies || [];
            const isMyComment = currentUser?.id === c.user?.id;

            return (
              <div key={c.id} className="comment-item">
                {c.status === "DELETED" ? (
                  <p className="comment-content deleted-comment">삭제된 댓글입니다.</p>
                ) : (
                  <>
                    <div className="comment-header">
                      <img
                        src={c.user.profile_image || "/default_profile.png"}
                        alt="프로필"
                        className="profile-thumb-small"
                      />
                      <span
                        className="comment-author"
                        onClick={() => navigate(`/profile/${c.user.id}`)}
                      >
                        {c.user.nickname}
                      </span>
                    </div>

                    {editingId === c.id ? (
                      <div className="reply-input">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className="reply-buttons">
                          <button onClick={() => handleEditSubmit(c.id)}>수정완료</button>
                          <button onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <p className="comment-content">{c.content}</p>
                    )}

                    <div className="comment-buttons">
                      {isLoggedIn && editingId !== c.id && (
                        <button
                          onClick={() =>
                            setReplyMap((prev) => ({
                              ...prev,
                              [c.id]: prev[c.id] ? undefined : "",
                            }))
                          }
                        >
                          💬 답글
                        </button>
                      )}
                      {renderButtons(c, isMyComment)}
                    </div>
                  </>
                )}

                {/* ✅ 대댓글 */}
                {replies.length > 0 && (
                  <div className="reply-list">
                    {replies.map((r) => {
                      const isMyReply = currentUser?.id === r.user?.id;
                      return (
                        <div key={r.id} className="reply-item">
                          {r.status === "DELETED" ? (
                            <p className="comment-content deleted-comment">
                              삭제된 댓글입니다.
                            </p>
                          ) : (
                            <>
                              <div className="comment-header">
                                <img
                                  src={r.user.profile_image || "/default_profile.png"}
                                  alt="프로필"
                                  className="profile-thumb-small"
                                />
                                <span
                                  className="comment-author"
                                  onClick={() => navigate(`/profile/${r.user.id}`)}
                                >
                                  {r.user.nickname}
                                </span>
                              </div>

                              {editingId === r.id ? (
                                <div className="reply-input">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                  />
                                  <div className="reply-buttons">
                                    <button onClick={() => handleEditSubmit(r.id)}>수정완료</button>
                                    <button onClick={() => setEditingId(null)}>취소</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="comment-content">{r.content}</p>
                              )}

                              <div className="comment-buttons">
                                {renderButtons(r, isMyReply)}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ✅ 답글 입력창 */}
                {replyMap[c.id] !== undefined && editingId !== c.id && (
                  <div className="reply-input">
                    <textarea
                      value={replyMap[c.id]}
                      onChange={(e) =>
                        setReplyMap({ ...replyMap, [c.id]: e.target.value })
                      }
                      placeholder="답글을 입력하세요"
                    />
                    <div className="reply-buttons">
                      <button onClick={() => handleAddReply(c.id)}>등록</button>
                      <button
                        className="cancel-reply"
                        onClick={() =>
                          setReplyMap((prev) => {
                            const updated = { ...prev };
                            delete updated[c.id];
                            return updated;
                          })
                        }
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
