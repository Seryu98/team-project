// src/features/account/ChangePassword.jsx
import React, { useState } from "react";
import axios from "axios";
import "./ChangePassword.css";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("❌ 새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.post(
        "http://localhost:8000/users/account/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("✅ 비밀번호가 성공적으로 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.detail || "변경 실패"}`);
    }
  };

  return (
    <div className="account-box">
      <h2>비밀번호 변경</h2>

      <form onSubmit={handleSubmit} className="account-form">
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="새 비밀번호"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" className="save-btn">
          비밀번호 변경
        </button>
      </form>

      {message && <p className="result-message">{message}</p>}
    </div>
  );
}

export default ChangePassword;
