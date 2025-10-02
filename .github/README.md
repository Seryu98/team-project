# 🚀 팀 프로젝트

## 📖 소개
이 프로젝트는 [React + Python + MySQL] 기반의 소규모 팀 프로젝트입니다.  
비전공자도 협업할 수 있도록 **역할 분담 + 공통 코드 컨벤션**을 적용했습니다.  

---

## 👥 팀원 & 역할
- 임성훈: 회원관리 & 인증 (회원가입, 로그인, 계정 관리)
- 이수형: 프로필 & 스킬 관리 (프로필 CRUD, 스킬 등록/조회)
- 이지훈: 프로젝트/스터디 모집 & 지원 (모집공고, 지원서, 승인/거절)
- 김찬중: 게시판 & 댓글 (유저 게시판, 랭킹 게시판)
- 왕성호: 알림 & 쪽지 & 관리자 (알림, 쪽지, 공지사항, 제재)

---

## 🗂 프로젝트 구조
### 프론트엔드 (React)
```
frontend/
  src/
    app/           // 전역 설정 (라우팅, 상태관리, 환경설정)
    components/    // 공용 컴포넌트 (Header, Footer, Modal 등)
    features/      // 기능(도메인) 단위 모듈
      auth/        // 로그인, 회원가입 UI + API
      notify/      // 알림 관련 UI + API
      profile/     // 프로필 페이지, 편집 UI
      project_post // 프로젝트/스터디 게시판 UI + 필터
    shared/        // 공용 훅, 유틸, 정적 리소스
    App.jsx
    main.jsx
```

### 백엔드 (Python/FastAPI)
```
backend/
  app/
    auth/          // 로그인, 회원가입, JWT 인증
    meta/          // 스킬관련
    users/         // 유저 관련 모델 + API
    project_post/  // 프로젝트/스터디 생성, 승인, 게시판
    profile/       // 프로필 관련 API
    notify/        // 알림 관련 API
    core/          // DB 연결, 보안, 설정
    models/        // Base + 모델 모음 (__init__)
    test/          // DB 연결 테스트 등
    main.py        // FastAPI 진입점
```

---

## ⚙ 실행 방법

### 1. 가상환경(venv) 설정 (최초 1회만)
# 항상 백앤드는 가상화를 해주세요. 프론트는 그냥 하면되고 커맨드에
# 프로젝트 루트에서 가상환경 생성(venv는 백앤드에 만들기 cd backend)
python -m venv venv

# 가상환경 활성화
.\venv\Scripts\activate

### 프론트엔드
cd frontend
npm install
npm run dev

### 백엔드
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload


