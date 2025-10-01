// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />;
  }
  return children;
}