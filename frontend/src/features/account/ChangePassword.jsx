// src/features/account/ChangePassword.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal"; // ✅ 공용 모달 불러오기
import "./ChangePassword.css";

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showModal, setShowModal] = useState(false); // ✅ 모달 표시 여부
  const navigate = useNavigate();

  // 🔹 비밀번호 변경 요청
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("❌ 새 비밀번호가 일치하지 않습니다.");
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

      // ✅ 성공 시 모달 표시
      setShowModal(true);
    } catch (err) {
      alert(`❌ ${err.response?.data?.detail || "비밀번호 변경 실패"}`);
    }
  };

  // 🔹 모달의 확인 버튼 클릭 시 처리
  const handleConfirm = () => {
    // ✅ 로그아웃 처리
    localStorage.removeItem("access_token");
    setShowModal(false);
    navigate("/login"); // 로그인 페이지로 이동
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

      {/* ✅ 공용 모달 표시 */}
      {showModal && (
        <Modal
          title="비밀번호 변경 완료"
          confirmText="확인"
          onConfirm={handleConfirm} // ✅ 확인 버튼 → 로그아웃 + 로그인 이동
          // ❌ onClose 제거 → ESC, 배경 클릭 시 아무 동작 없음
        >
          비밀번호가 성공적으로 변경되었습니다.  
          다시 로그인해주세요.
        </Modal>
      )}
    </div>
  );
}

export default ChangePassword;
