import { useEffect, useState } from "react";
import { getCurrentUser, authFetch } from "../auth/api";
import "./AccountSettings.css"; // ✅ CSS 분리 적용

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchUser() {
      try {
        const me = await getCurrentUser();
        setUser(me);
        setNickname(me.nickname || "");
        setPhone(me.phone_number || "");
      } catch (err) {
        console.error(err);
        setMessage("사용자 정보를 불러올 수 없습니다.");
      }
    }
    fetchUser();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    try {
      await authFetch("/auth/me", {
        method: "PATCH", // ✅ 백엔드와 일치
        body: JSON.stringify({
          nickname,
          phone_number: phone,
        }),
      });
      setMessage("✅ 개인정보가 수정되었습니다.");
    } catch {
      setMessage("❌ 수정 실패");
    }
  }

  async function handleDelete() {
    if (
      !window.confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")
    )
      return;
    try {
      await authFetch("/auth/delete-account", {
        method: "DELETE",
      });
      alert("계정이 탈퇴 처리되었습니다.");
      localStorage.clear();
      window.location.href = "/login"; // 탈퇴 후 로그인 페이지로 이동
    } catch {
      setMessage("❌ 탈퇴 실패");
    }
  }

  if (!user) return <p>로딩 중...</p>;

  return (
    <div className="account-container">
      <div className="account-box">
        <h2 className="account-title">개인정보 수정</h2>
        <form className="account-form" onSubmit={handleSave}>
          <div>
            <label>이메일</label>
            <input type="text" value={user.email} disabled />
          </div>
          <div>
            <label>이름</label>
            <input type="text" value={user.name || ""} disabled />
          </div>
          <div>
            <label>닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div>
            <label>전화번호</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button type="submit" className="account-button">
            저장
          </button>
        </form>

        <button onClick={handleDelete} className="delete-button">
          회원 탈퇴
        </button>

        {message && <p className="account-message">{message}</p>}
      </div>
    </div>
  );
}
