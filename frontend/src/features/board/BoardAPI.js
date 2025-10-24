// frontend/src/features/board/BoardAPI.js
// 🧩 유저 게시판 API (최종 완성형)
import { authFetch } from "../auth/api";

// ----------------------
// 📂 카테고리
// ----------------------
export async function getBoardCategories() {
  return await authFetch(`/board/categories`, { method: "GET" });
}

// ----------------------
// 📌 게시글
// ----------------------
export async function getBoardPosts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await authFetch(`/board${query ? `?${query}` : ""}`, { method: "GET" });
}

export async function getBoardPostDetail(postId) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/public/board/${postId}`, {
    method: "GET",
  });
  const data = await res.json();
  return { post: data.post || {}, comments: data.comments || [] };
}
export async function createBoardPost(data) {
  const res = await authFetch(`/board`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { success: !!res?.id, post_id: res.id };
}

export async function updateBoardPost(postId, data) {
  const res = await authFetch(`/board/${postId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return { success: res?.success ?? true };
}

export async function deleteBoardPost(postId) {
  const res = await authFetch(`/board/${postId}`, { method: "DELETE" });
  return { success: res?.success ?? true };
}

export async function toggleBoardLike(postId) {
  const res = await authFetch(`/board/${postId}/like`, { method: "POST" });
  return { success: res?.success ?? true, like_count: res?.like_count ?? 0 };
}

export async function reportBoardPost(postId, reason) {
  const res = await authFetch(`/board/reports`, {
    method: "POST",
    body: JSON.stringify({
      target_type: "BOARD_POST",
      target_id: postId,
      reason,
    }),
  });
  return { success: res?.success ?? true };
}

// ----------------------
// 💬 댓글
// ----------------------
export async function getBoardComments(postId) {
  const res = await authFetch(`/board/${postId}/comments`, { method: "GET" });
  return res.comments || [];
}

export async function createBoardComment(postId, data) {
  const res = await authFetch(`/board/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content: data.content,
      parent_id: data.parent_id || null,
    }),
  });
  return { success: !!res?.id, comment_id: res?.id };
}

export async function deleteBoardComment(commentId) {
  const res = await authFetch(`/board/comments/${commentId}`, {
    method: "DELETE",
  });
  return { success: res?.success ?? true };
}

export async function reportBoardComment(commentId, reason) {
  const res = await authFetch(`/board/reports`, {
    method: "POST",
    body: JSON.stringify({
      target_type: "COMMENT",
      target_id: commentId,
      reason,
    }),
  });
  return { success: res?.success ?? true };
}

// ✅ 댓글 수정 (수정 실패 해결)
export async function updateBoardComment(commentId, data) {
  const res = await authFetch(`/board/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({
      content: data.content,
    }),
  });
  return { success: res?.success ?? false, message: res?.message || "" };
}
