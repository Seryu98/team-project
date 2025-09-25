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
    components/   // 공용 컴포넌트 (버튼, 카드 등)
    pages/        // 페이지 단위 화면 (로그인, 회원가입 등)
    hooks/        // 커스텀 훅 (useAuth, useFetch 등)
    services/     // API 호출 로직
    assets/       // 이미지, CSS, 아이콘
    utils/        // 공용 함수 (날짜 포맷, 숫자 변환 등)
```

### 백엔드 (Python/FastAPI)
```
backend/
  app/
    routers/     // API 엔드포인트
    services/    // 비즈니스 로직
    models/      // DB 모델
    schemas/     // 요청/응답 DTO
    core/        // 설정, DB 연결, 보안
    utils/       // 공용 함수
```

### DB
- migrations/ : 테이블 변경 이력 관리

---

## ⚙ 실행 방법
### 프론트엔드
cd frontend
npm install
npm start

### 백엔드
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload


