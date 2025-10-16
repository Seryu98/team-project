// frontend/src/features/home/HomePage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// 슬라이더 컴포넌트
function Slider({ items, renderItem, autoPlayInterval = 3000 }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (items.length === 0) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, autoPlayInterval);

        return () => clearInterval(timer);
    }, [items.length, autoPlayInterval]);

    const goToSlide = (index) => setCurrentIndex(index);
    const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    const goToNext = () => setCurrentIndex((prev) => (prev + 1) % items.length);

    if (items.length === 0) return null;

    return (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '1rem' }}>
            {/* 슬라이드 컨텐츠 */}
            <div style={{
                display: 'flex',
                transition: 'transform 0.5s ease-in-out',
                transform: `translateX(-${currentIndex * 100}%)`
            }}>
                {items.map((item, index) => (
                    <div key={index} style={{ minWidth: '100%', padding: '0 0.5rem' }}>
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>

            {/* 좌우 버튼 */}
            {items.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '3rem',
                            height: '3rem',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}
                    >
                        ‹
                    </button>
                    <button
                        onClick={goToNext}
                        style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '3rem',
                            height: '3rem',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}
                    >
                        ›
                    </button>
                </>
            )}

            {/* 인디케이터 */}
            {items.length > 1 && (
                <div style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '0.5rem',
                    zIndex: 10
                }}>
                    {items.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            style={{
                                width: '0.75rem',
                                height: '0.75rem',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: index === currentIndex ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HomePage() {
    const navigate = useNavigate();
    const [topUsers, setTopUsers] = useState([]);
    const [topProjects, setTopProjects] = useState([]);
    const [topBoards, setTopBoards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const config = token ? {
                    headers: { Authorization: `Bearer ${token}` }
                } : {};

                // ✅ 유저 랭킹 (토큰 필요)
                try {
                    const usersRes = await axios.get(`${API_URL}/stats/user-ranking`, config);
                    setTopUsers(usersRes.data.slice(0, 3));
                } catch (err) {
                    console.error("❌ 유저 랭킹 로드 실패:", err.response?.status, err.message);
                }

                // ✅ 최신 프로젝트
                try {
                    let projectsRes;
                    try {
                        projectsRes = await axios.get(`${API_URL}/recipe/list?skip=0&limit=3`, config);
                    } catch {
                        projectsRes = await axios.get(`${API_URL}/posts?skip=0&limit=3`, config);
                    }
                    const projects = Array.isArray(projectsRes.data)
                        ? projectsRes.data
                        : projectsRes.data.posts || [];
                    setTopProjects(projects.slice(0, 3));
                } catch (err) {
                    console.error("❌ 프로젝트 로드 실패:", err.response?.status);
                }

                // ✅ 인기 게시판 (토큰 제거)
                try {
                    const boardRes = await axios.get(`${API_URL}/board/list?skip=0&limit=20`);
                    const boards = boardRes.data.posts || [];
                    const sortedBoards = Array.isArray(boards)
                        ? boards.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
                        : [];
                    setTopBoards(sortedBoards.slice(0, 3));
                } catch (err) {
                    console.error("❌ 게시판 로드 실패:", err.response?.status);
                }

            } catch (err) {
                console.error("❌ 데이터 로드 실패:", err);
            } finally {
                // ✅ fetchData 전체 끝나고 로딩 해제
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                    <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>로딩중...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
            {/* 🎯 Hero Section */}
            <section style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #4f46e5 100%)',
                padding: '6rem 1.5rem'
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '3.5rem',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: '1.5rem',
                        lineHeight: '1.2'
                    }}>
                        함께 만들어가는<br />프로젝트의 시작
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: '2.5rem',
                        maxWidth: '800px',
                        margin: '0 auto 2.5rem'
                    }}>
                        개발자, 디자이너, 기획자가 모여 아이디어를 실현합니다
                    </p>

                    {/* Search Bar */}
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '9999px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <input
                                type="text"
                                placeholder="프로젝트, 스터디, 기술스택을 검색해보세요"
                                style={{
                                    flex: 1,
                                    padding: '0.75rem 1.5rem',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    borderRadius: '9999px'
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') navigate('/posts');
                                }}
                            />
                            <button
                                onClick={() => navigate('/posts')}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '9999px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                검색
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem' }}>
                {/* 🏆 인기 유저 TOP 3 슬라이더 */}
                {topUsers.length > 0 && (
                    <section style={{ marginBottom: '4rem', marginTop: '4rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                                팔로워 1점 · 게시물 2점 · 좋아요 3점
                            </p>
                            <h2 style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: '#111827'
                            }}>
                                🏆 이번 주 인기 멤버
                            </h2>
                        </div>

                        <Slider
                            items={topUsers}
                            renderItem={(user, idx) => (
                                <div
                                    onClick={() => navigate(`/profile/${user.id}`)}
                                    style={{
                                        background: idx === 0
                                            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                                            : idx === 1
                                                ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                                                : 'linear-gradient(135deg, #d97706, #b45309)',
                                        borderRadius: '1.5rem',
                                        padding: '3rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                        textAlign: 'center',
                                        minHeight: '400px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {/* 순위 배지 */}
                                    <div style={{
                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '0.5rem 1.5rem',
                                        borderRadius: '9999px',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        marginBottom: '2rem'
                                    }}>
                                        {idx === 0 ? '🏆 1위' : idx === 1 ? '🥈 2위' : '🥉 3위'}
                                    </div>

                                    {/* 프로필 이미지 */}
                                    <div style={{
                                        width: '10rem',
                                        height: '10rem',
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '4rem',
                                        fontWeight: 'bold',
                                        color: '#6b7280',
                                        marginBottom: '1.5rem',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                                        overflow: 'hidden'
                                    }}>
                                        {user.profile_image ? (
                                            <img src={user.profile_image} alt={user.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            user.nickname?.charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    {/* 유저 정보 */}
                                    <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
                                        {user.nickname}
                                    </h3>

                                    <div style={{ display: 'flex', gap: '3rem', color: 'white', fontSize: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{user.followers}</div>
                                            <div style={{ opacity: 0.9 }}>팔로워</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{user.project_posts + user.board_posts}</div>
                                            <div style={{ opacity: 0.9 }}>게시물</div>
                                        </div>
                                    </div>

                                    <div style={{
                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '0.75rem 2rem',
                                        borderRadius: '9999px',
                                        fontSize: '1.25rem',
                                        fontWeight: 'bold'
                                    }}>
                                        ⭐ {user.score} 점
                                    </div>
                                </div>
                            )}
                        />
                    </section>
                )}

                {/* 🚀 최신 프로젝트 TOP 3 슬라이더 */}
                {topProjects.length > 0 && (
                    <section style={{ marginBottom: '4rem' }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: '#111827',
                            marginBottom: '2rem',
                            textAlign: 'center'
                        }}>
                            🚀 최신 프로젝트
                        </h2>

                        <Slider
                            items={topProjects}
                            renderItem={(project) => (
                                <div
                                    onClick={() => navigate(`/recipe/${project.id}`)}
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                        borderRadius: '1.5rem',
                                        padding: '3rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                        minHeight: '400px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        color: 'white'
                                    }}
                                >
                                    {/* 타입 배지 */}
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            backgroundColor: 'rgba(255,255,255,0.3)',
                                            padding: '0.5rem 1.5rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {project.type === "PROJECT" ? "프로젝트" : "스터디"}
                                        </span>
                                    </div>

                                    {/* 프로젝트 정보 */}
                                    <div>
                                        <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                                            {project.title}
                                        </h3>
                                        <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '2rem', lineHeight: '1.6' }}>
                                            {project.description || "프로젝트 설명이 없습니다."}
                                        </p>
                                    </div>

                                    {/* 하단 정보 */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '3rem',
                                                height: '3rem',
                                                borderRadius: '50%',
                                                backgroundColor: 'white',
                                                color: '#6b7280',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '1.25rem'
                                            }}>
                                                {project.leader_nickname?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                                {project.leader_nickname}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '1rem' }}>
                                            <span>💬 {project.comment_count || 0}</span>
                                            <span>👥 {project.current_members || 0}/{project.max_members || "?"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </section>
                )}

                {/* 💬 인기 게시글 TOP 3 슬라이더 */}
                {topBoards.length > 0 && (
                    <section style={{ marginBottom: '4rem' }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: '#111827',
                            marginBottom: '2rem',
                            textAlign: 'center'
                        }}>
                            💬 인기 게시글
                        </h2>

                        <Slider
                            items={topBoards}
                            renderItem={(post, idx) => (
                                <div
                                    onClick={() => navigate(`/board/${post.id}`)}
                                    style={{
                                        background: idx === 0
                                            ? 'linear-gradient(135deg, #ec4899, #f43f5e)'
                                            : idx === 1
                                                ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                                : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                                        borderRadius: '1.5rem',
                                        padding: '3rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                        minHeight: '350px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        color: 'white'
                                    }}
                                >
                                    {/* 순위 + 카테고리 */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div style={{
                                            backgroundColor: 'rgba(255,255,255,0.3)',
                                            padding: '0.5rem 1.5rem',
                                            borderRadius: '9999px',
                                            fontSize: '1.25rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {idx + 1}위
                                        </div>
                                        <div style={{
                                            backgroundColor: 'rgba(255,255,255,0.3)',
                                            padding: '0.5rem 1.25rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.875rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {post.category || "일반"}
                                        </div>
                                    </div>

                                    {/* 제목 */}
                                    <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: '1.3' }}>
                                        {post.title}
                                    </h3>

                                    {/* 하단 정보 */}
                                    <div>
                                        <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', opacity: 0.9 }}>
                                            {post.author_nickname || "익명"}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '1rem', opacity: 0.95 }}>
                                            <span>❤️ {post.like_count || 0}</span>
                                            <span>💬 {post.comment_count || 0}</span>
                                            <span>👁️ {post.view_count || 0}</span>
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </section>
                )}

                {/* 데이터 없을 때 */}
                {topUsers.length === 0 && topProjects.length === 0 && topBoards.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                            아직 콘텐츠가 없습니다
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>첫 번째 프로젝트를 등록해보세요!</p>
                        <button
                            onClick={() => navigate('/recipe/create')}
                            style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                padding: '0.75rem 2rem',
                                borderRadius: '9999px',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            프로젝트 등록하기
                        </button>
                    </div>
                )}
            </div>

            {/* 🌟 CTA Section */}
            <section style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                padding: '5rem 1.5rem'
            }}>
                <div style={{ maxWidth: '1024px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>
                        지금 바로 시작해보세요
                    </h2>
                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.9)', marginBottom: '2rem' }}>
                        당신의 아이디어를 현실로 만들어줄 팀원이 기다리고 있습니다
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                backgroundColor: 'white',
                                color: '#2563eb',
                                padding: '1rem 2.5rem',
                                borderRadius: '9999px',
                                fontWeight: 'bold',
                                fontSize: '1.125rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                            }}
                        >
                            무료로 시작하기
                        </button>
                        <button
                            onClick={() => navigate('/recipe/create')}
                            style={{
                                backgroundColor: '#1e40af',
                                color: 'white',
                                padding: '1rem 2.5rem',
                                borderRadius: '9999px',
                                fontWeight: 'bold',
                                fontSize: '1.125rem',
                                border: '2px solid rgba(255,255,255,0.2)',
                                cursor: 'pointer'
                            }}
                        >
                            프로젝트 등록하기
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}