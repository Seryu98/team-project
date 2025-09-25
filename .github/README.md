# 🚀 팀 프로젝트

## 📖 소개
이 프로젝트는 [React + Python + MySQL] 기반의 소규모 팀 프로젝트입니다.  
비전공자도 협업할 수 있도록 **역할 분담 + 공통 코드 컨벤션**을 적용했습니다.  

---

## 👥 팀원 & 역할
- 팀원 A: 회원관리 & 인증 (회원가입, 로그인, 계정 관리)
- 팀원 B: 프로필 & 스킬 관리 (프로필 CRUD, 스킬 등록/조회)
- 팀원 C: 프로젝트/스터디 모집 & 지원 (모집공고, 지원서, 승인/거절)
- 팀원 D: 게시판 & 댓글 (유저 게시판, 랭킹 게시판)
- 팀원 E: 알림 & 쪽지 & 관리자 (알림, 쪽지, 공지사항, 제재)

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

## 🎨 코드 컨벤션
### 네이밍 규칙
- React 컴포넌트: PascalCase → UserProfile.jsx
- React hooks: use + camelCase → useAuth.js
- Python 파일: snake_case → user_service.py
- Python 클래스: PascalCase → UserService
- DB 테이블/컬럼: snake_case → users, user_id

### 코드 스타일
- React: 들여쓰기 2 space, double quotes, 세미콜론 필수
- Python: PEP8, 함수 50줄 이내, print 대신 logging
- SQL: 키워드 대문자, SELECT * 금지, created_at/updated_at 기본 추가

---

## 💬 커밋 규칙
- 형식: [타입] 설명
- 타입 예시:
  - feat: 새로운 기능
  - fix: 버그 수정
  - style: 코드 포맷 변경
  - docs: 문서 수정
  - chore: 환경 설정

예시:
```
feat: 회원가입 API 추가
fix: 로그인 토큰 오류 수정
```

---

## 📡 API 규칙
- RESTful 원칙 준수 → /users, /users/{id}/posts
- 응답 형식(JSON):
```json
{
  "success": true,
  "data": { "user_id": 1, "name": "홍길동" },
  "message": "조회 성공"
}
```

---

## ✅ 최소 지켜야 할 3가지
1. 네이밍 통일  
2. 커밋 메시지 규칙 준수  
3. 폴더 구조 강제
