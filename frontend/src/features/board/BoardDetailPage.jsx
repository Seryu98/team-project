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

  useEffect(() => {
    if (post?.badge) {
      console.log("✅ [DEBUG] post.badge:", post.badge);
    }
  }, [post]);

  // ===============================
  // 좋아요
  // ===============================
  const handleLike = async () => {
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      navigate("/login");
      return;
    }
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
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      navigate("/login");
      return;
    }
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
    if (!isLoggedIn) {
      alert("로그인 후 댓글을 작성할 수 있습니다.");
      navigate("/login");
      return;
    }
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
    if (!isLoggedIn) {
      alert("로그인 후 답글을 작성할 수 있습니다.");
      navigate("/login");
      return;
    }
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
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      navigate("/login");
      return;
    }
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
    if (!isLoggedIn) {
      alert("로그인 후 이용 가능합니다.");
      navigate("/login");
      return;
    }
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
  // 🩵 실시간 알림 갱신 (신고 시 반영)
  // ===============================
  const bumpNotificationList = () => {
    try {
      localStorage.setItem("refreshNotifications", Date.now().toString());
      setTimeout(() => localStorage.removeItem("refreshNotifications"), 50);
    } catch { }
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
    return (
      <>
        {isMine ? (
          <>
            <button className="edit-btn" onClick={() => startEdit(item.id, item.content)}>
              수정
            </button>
            <button className="delete-btn" onClick={() => handleCommentDelete(item.id)}>
              삭제
            </button>
          </>
        ) : (
          isLoggedIn && (
            <button
              className="report-btn"
              onClick={async () => {
                const reason = prompt("신고 사유를 입력해주세요:");
                if (!reason || !reason.trim()) return alert("신고 사유를 입력해야 합니다.");
                try {
                  await submitReport("COMMENT", item.id, reason);
                  alert("🚨 댓글 신고가 접수되었습니다.");
                  bumpNotificationList();
                } catch (err) {
                  console.error("❌ 댓글 신고 실패:", err);
                  alert("신고 중 오류가 발생했습니다.");
                }
              }}
            >
              🚨 신고
            </button>
          )
        )}
      </>
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
        {/* 제목 + 날짜 */}
        <div className="detail-header-row">
          <div className="detail-title-left">
            {/* 🏅 제목 왼쪽 배지 */}
            <div className="badge-inline-left">
              {post.badge?.includes("Gold Medal") && (
                <span className="badge-medal badge-gold">🥇 1위</span>
              )}
              {post.badge?.includes("Silver Medal") && (
                <span className="badge-medal badge-silver">🥈 2위</span>
              )}
              {post.badge?.includes("Bronze Medal") && (
                <span className="badge-medal badge-bronze">🥉 3위</span>
              )}
              {post.badge?.includes("인기급상승") && (
                <span className="badge-hot">🔥 인기급상승</span>
              )}
            </div>
            <h2 className="detail-title">{post.title}</h2>
          </div>
          <span className="detail-date">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        {/* 이미지 + 본문 */}
        <div className="detail-content-section">
          {/* 이미지 */}
          <div className="detail-image-box">
            <img
              src={`${import.meta.env.VITE_API_BASE_URL}${post.attachment_url}`}
              alt={`${post.category_name} 대표 이미지`}
              className="post-cover"
            />
          </div>

          {/* 본문 */}
          <div
            className="detail-text"
            dangerouslySetInnerHTML={{ __html: post.content }}
          ></div>
        </div>


        {/* 메타 정보 */}
        <div className="detail-meta">
          <span className="detail-meta-item">홍보글</span> |
          <span className="detail-meta-item">👁 {post.view_count}</span> |
          <span className="detail-meta-item">💬 {visibleCommentCount}</span>
        </div>

        
        {/* 작성자 + 좋아요 */}
        <div className="detail-author-like">
          <div className="author-box">
            <img
              src={
                post?.author?.profile_image
                  ? `http://localhost:8000${post.author.profile_image}`
                  : "http://localhost:8000/assets/profile/default_profile.png"
              }
              alt="프로필"
              className="profile-thumb"
              onClick={() => post?.author && navigate(`/profile/${post.author.id}`)}
            />
            <span
              className="nickname"
              onClick={() => post?.author && navigate(`/profile/${post.author.id}`)}
            >
              {post?.author?.nickname || "알 수 없는 작성자"}
            </span>
          </div>
          {isLoggedIn && (
            <button className="like-btn" onClick={handleLike}>
              ❤️ {post.like_count}
            </button>
          )}
        </div>


        {/* 🚨 게시글 신고 버튼 (작성자 본인 제외) */}
        {isLoggedIn && !isOwner && (
          <button
            className="report-btn"
            onClick={async () => {
              const reason = prompt("이 게시글을 신고하는 이유를 입력해주세요:");
              if (!reason || !reason.trim()) return alert("신고 사유를 입력해야 합니다.");
              try {
                await submitReport("BOARD_POST", post.id, reason);
                alert("🚨 게시글 신고가 접수되었습니다.");
                bumpNotificationList();
              } catch (err) {
                console.error("❌ 게시글 신고 실패:", err);
                alert("신고 중 오류가 발생했습니다.");
              }
            }}
          >
            🚨 게시글 신고
          </button>
        )}

        {/* 수정 / 삭제 */}
        {isOwner && (
          <div className="detail-actions">
            <button className="edit-btn" onClick={() => navigate(`/board/${post.id}/edit`)}>
              수정
            </button>
            <button className="delete-btn" onClick={handleDelete}>
              삭제
            </button>
          </div>
        )}

        <hr />

        {/* 댓글 영역 */}
        <div className="comments-section">
          <h3>💬 댓글 ({visibleCommentCount})</h3>

          {isLoggedIn ? (
            <div className="comment-input">
              <textarea
                placeholder="댓글을 입력하세요"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="submit-btn" onClick={handleCommentSubmit}>등록</button>
            </div>
          ) : (
            <p>💡 로그인 후 댓글을 작성할 수 있습니다.</p>
          )}

          {/* 댓글 + 대댓글 */}
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
                        src={
                          c.user.profile_image
                            ? `http://localhost:8000${c.user.profile_image}`
                            : "http://localhost:8000/assets/profile/default_profile.png"
                        }
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
                          <button className="submit-btn" onClick={() => handleEditSubmit(c.id)}>수정완료</button>
                          <button className="cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="comment-content"
                        dangerouslySetInnerHTML={{ __html: c.content }}
                      ></div>

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

                {/* 대댓글 */}
                {replies.length > 0 && (
                  <div className="reply-list">
                    {replies.map((r) => {
                      const isMyReply = currentUser?.id === r.user?.id;
                      return (
                        <div key={r.id} className="reply-item">
                          {r.status === "DELETED" ? (
                            <p className="comment-content deleted-comment">삭제된 댓글입니다.</p>
                          ) : (
                            <>
                              <div className="comment-header">
                                <img
                                  src={
                                    r.user.profile_image
                                      ? `http://localhost:8000${r.user.profile_image}`
                                      : "http://localhost:8000/assets/profile/default_profile.png"
                                  }
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
                                    <button className="submit-btn" onClick={() => handleEditSubmit(r.id)}>수정완료</button>
                                    <button className="cancel-btn" onClick={() => setEditingId(null)}>취소</button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="comment-content"
                                  dangerouslySetInnerHTML={{ __html: r.content }}
                                ></div>

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

                {/* 답글 입력창 */}
                {replyMap[c.id] !== undefined && editingId !== c.id && (
                  <div className="reply-input">
                    <textarea
                      value={replyMap[c.id]}
                      onChange={(e) => setReplyMap({ ...replyMap, [c.id]: e.target.value })}
                      placeholder="답글을 입력하세요"
                    />
                    <div className="reply-buttons">
                      <button className="submit-btn" onClick={() => handleAddReply(c.id)}>등록</button>
                      <button
                        className="cancel-btn"
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
