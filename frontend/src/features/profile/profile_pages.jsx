// src/features/profile/ProfilePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";

/** 정적 에셋 자동 로딩 */
function buildIconMap(globs) {
  const map = {};
  for (const [path, url] of Object.entries(globs)) {
    const base = path.split("/").pop().replace(".png", "").toLowerCase();
    map[base] = url;
  }
  return map;
}
const skillGlob1 = import.meta.glob("../../shared/assets/skills/*.png", { eager: true, as: "url" });
const skillGlob2 = import.meta.glob("../../app/shared/assets/skills/*.png", { eager: true, as: "url" });
const starGlob1 = import.meta.glob("../../shared/assets/star/*.png", { eager: true, as: "url" });
const starGlob2 = import.meta.glob("../../app/shared/assets/star/*.png", { eager: true, as: "url" });

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("followers");
  const [list, setList] = useState([]);

  // 아이콘 맵
  const SKILL_ICONS = useMemo(
    () => ({ ...buildIconMap(skillGlob1), ...buildIconMap(skillGlob2) }),
    []
  );
  const STAR_ICONS = useMemo(
    () => ({ ...buildIconMap(starGlob1), ...buildIconMap(starGlob2) }),
    []
  );
  const oneStarUrl = STAR_ICONS["onestar"] || "/assets/star/onestar.png";
  const zeroStarUrl = STAR_ICONS["zerostar"] || "/assets/star/zerostar.png";

  // 스킬 아이콘 경로 보정
  const resolveSkillIconUrl = (rawName) => {
    if (!rawName) return "";
    let norm = String(rawName).trim().toLowerCase().replace(/\s+/g, "_");
    const aliases = {
      "c#": "csharp",
      "c++": "cplus",
      "f#": "fsharp",
      "react native": "react_native",
      "react-native": "react_native",
      reactnative: "react_native",
      objectivec: "objective",
      "objective-c": "objective",
      "objective c": "objective",
      "postgre_sql": "postgresql",
      "ms_sql_server": "mssqlserver",
    };
    norm = aliases[norm] || norm;
    if (SKILL_ICONS[norm]) return SKILL_ICONS[norm];
    return `/assets/skills/${rawName.replace(/\s+/g, "_")}.png`;
  };

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(res.data);
    } catch {
      setCurrentUser(null);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("로그인이 필요합니다.");
        return;
      }
      let endpoint;
      if (userId) {
        endpoint = `/profiles/${userId}`;
      } else {
        const me = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        endpoint = `/profiles/${me.data.id}`;
      }
      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch {
      alert("프로필 불러오기 실패");
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProfile();
  }, [userId]);

 const handleFollowToggle = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (profile.is_following) {
      // 언팔로우 요청
      await api.delete(`/follows/${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 상태 즉시 반영 (fetchProfile() 호출 X)
      setProfile((prev) => ({
        ...prev,
        is_following: false,
        follower_count: prev.follower_count - 1, // 팔로워 수 줄여줌
      }));
    } else {
      // 팔로우 요청
      await api.post(`/follows/${profile.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 상태 즉시 반영
      setProfile((prev) => ({
        ...prev,
        is_following: true,
        follower_count: prev.follower_count + 1, // 팔로워 수 늘려줌
      }));
    }
  } catch {
    alert("팔로우/언팔로우 실패");
  }
};

  const fetchFollowList = async (type) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        type === "followers"
          ? `/follows/${profile.id}/followers`
          : `/follows/${profile.id}/followings`;
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

  const handleUnfollowInModal = async (targetId) => {
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/follows/${targetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList((prev) => prev.filter((u) => u.id !== targetId));
      fetchProfile();
    } catch {
      alert("팔로우 취소 실패");
    }
  };

  if (!profile) return <div className="text-center mt-10">로딩 중...</div>;

  return (
    <div className="flex justify-center mt-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-3xl relative">
        {/* 상단 */}
        <div className="flex items-center gap-6 border-b pb-6">
          <img
            src={
              profile.profile_image
                ? `http://localhost:8000${profile.profile_image}`
                : "/assets/default_profile.png"
            }
            alt="프로필 이미지"
            className="w-24 h-24 rounded-full border object-cover"
          />
          <div>
            <h2 className="text-2xl font-bold">{profile.nickname}</h2>
            <p className="text-gray-500">{profile.email}</p>
            {currentUser && currentUser.id === profile.id && (
              <button
                onClick={() => navigate("/profile/create")}
                className="mt-2 px-4 py-1 rounded bg-green-500 text-white"
              >
                프로필 수정
              </button>
            )}
            {currentUser && currentUser.id !== profile.id && (
              <button
                onClick={handleFollowToggle}
                className={`mt-2 px-4 py-1 rounded text-white ${profile.is_following ? "bg-red-500" : "bg-blue-500"
                  }`}
              >
                {profile.is_following ? "언팔로우" : "팔로우"}
              </button>
            )}
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

        {/* 보유 스킬 */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">보유 스킬</h3>
          <div className="grid grid-cols-2 gap-4">
            {profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-3 p-2 border rounded">
                  <img
                    src={resolveSkillIconUrl(skill.name)}
                    alt={skill.name}
                    className="w-5 h-5"
                  />
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((star) => (
                        <img
                          key={star}
                          src={star <= skill.level ? oneStarUrl : zeroStarUrl}
                          alt="별점"
                          className="w-5 h-5"
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

        {/* 팔로워/팔로잉 모달 */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">
                {modalType === "followers" ? "팔로워 목록" : "팔로잉 목록"}
              </h2>
              <ul>
                {list.length > 0 ? (
                  list.map((user) => (
                    <li key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => {
                          setShowModal(false);
                          navigate(`/profile/${user.id}`);
                        }}
                      >
                        <img
                          src={
                            user.profile_image
                              ? `http://localhost:8000${user.profile_image}`
                              : "/assets/default_profile.png"
                          }
                          alt={user.nickname}
                          className="w-10 h-10 rounded-full border object-cover"
                        />
                        <div>
                          <p className="font-medium">{user.nickname}</p>
                          <p className="text-sm text-gray-500">
                            {user.headline || "자기소개 없음"}
                          </p>
                        </div>
                      </div>
                      {user.is_following && (
                        <button
                          onClick={() => handleUnfollowInModal(user.id)}
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
