// src/components/ProtectedRoute.jsx
// 로그인을 하지않으면 접속하지못하게
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("로그인 후 이용 가능합니다.");
    return <Navigate to="/login" replace />;
  }

  return children;
}