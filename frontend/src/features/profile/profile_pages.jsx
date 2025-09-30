import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";

export default function ProfilePage() {
  const { userId } = useParams(); // /profile/:userId
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  // Modal 상태
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("followers");
  const [list, setList] = useState([]);

  // ✅ 프로필 불러오기
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/profiles/${userId || 1}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      alert("프로필 불러오기 실패");
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  // ✅ 팔로워/팔로잉 목록 불러오기
  const fetchFollowList = async (type) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        type === "followers"
          ? `/follows/${userId}/followers`
          : `/follows/${userId}/followings`;

      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data);
      setModalType(type);
      setShowModal(true);
    } catch {
      alert("목록 불러오기 실패");
    }
  };

  // ✅ 언팔로우 요청
  const handleUnfollow = async (targetId) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/follows/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 성공 시 목록 갱신
      setList((prev) => prev.filter((u) => u.id !== targetId));
      fetchProfile(); // 팔로워/팔로잉 숫자 새로고침
    } catch {
      alert("팔로우 취소 실패");
    }
  };

  if (!profile) return <div className="text-center mt-10">로딩 중...</div>;

  const getIconPath = (name) =>
    `/assets/skills/${name
      .toLowerCase()
      .replace(/\+/g, "plus")
      .replace(/#/g, "sharp")}.png`;

  return (
    <div className="flex justify-center mt-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-2xl relative">
        {/* 프로필 정보 */}
        <div className="flex items-center gap-6">
          <img
            src={profile.profile_image || "/assets/default_profile.png"}
            alt="프로필 이미지"
            className="w-24 h-24 rounded-full border object-cover"
          />
          <div>
            <h2 className="text-2xl font-bold">{profile.nickname}</h2>
            <p className="text-gray-500">{profile.email}</p>

            {/* 팔로워/팔로잉 숫자 */}
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span
                className="cursor-pointer hover:underline"
                onClick={() => fetchFollowList("followers")}
              >
                팔로워 {profile.follower_count}
              </span>
              <span
                className="cursor-pointer hover:underline"
                onClick={() => fetchFollowList("followings")}
              >
                팔로잉 {profile.following_count}
              </span>
            </div>
          </div>
        </div>

        {/* 자기소개 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">자기소개</h3>
          <p className="text-gray-700 whitespace-pre-line">
            {profile.bio || "아직 자기소개가 없습니다."}
          </p>
        </div>

        {/* 스킬 목록 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">보유 스킬</h3>
          <div className="grid grid-cols-2 gap-4">
            {profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <img
                    src={getIconPath(skill.name)}
                    alt={skill.name}
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((star) => (
                        <img
                          key={star}
                          src={
                            star <= skill.level
                              ? "/assets/star/star_filled.png"
                              : "/assets/star/star_empty.png"
                          }
                          alt="별점"
                          className="w-4 h-4"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">등록된 스킬이 없습니다.</p>
            )}
          </div>
        </div>

        {/* ✅ Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">
                {modalType === "followers" ? "팔로워 목록" : "팔로잉 목록"}
              </h2>
              <ul>
                {list.length > 0 ? (
                  list.map((user) => (
                    <li
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-100"
                    >
                      {/* 프로필 이동 */}
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => {
                          setShowModal(false);
                          navigate(`/profile/${user.id}`);
                        }}
                      >
                        <img
                          src={
                            user.profile_image || "/assets/default_profile.png"
                          }
                          alt={user.nickname}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{user.nickname}</p>
                          <p className="text-sm text-gray-500">
                            {user.headline || "자기소개 없음"}
                          </p>
                        </div>
                      </div>

                      {/* 팔로우 취소 버튼 */}
                      {user.is_following && (
                        <button
                          onClick={() => handleUnfollow(user.id)}
                          className="text-red-500 text-sm ml-2"
                        >
                          취소
                        </button>
                      )}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">아직 아무도 없습니다.</p>
                )}
              </ul>
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 w-full bg-gray-200 py-2 rounded"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
