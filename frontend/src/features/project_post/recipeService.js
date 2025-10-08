// /src/feature/project_post/recipeService.js
import axios from "axios";

const API_BASE = "http://localhost:8000"; // 백엔드 주소

// 모집공고 생성
export async function createRecipePost(data, token) {
  const res = await axios.post(`${API_BASE}/recipe/`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}