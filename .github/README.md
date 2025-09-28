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
      여러 페이지에서 공통으로 쓰는 UI 조각들
      버튼, 입력창, 카드, 네비게이션 바 같은 것들
    pages/        // 페이지 단위 화면 (로그인, 회원가입 등)
      화면 단위 컴포넌트 (로그인 화면, 회원가입 화면 등)
      주로 components/를 조합해서 화면 구성
    hooks/        // 커스텀 훅 (useAuth, useFetch 등)
      반복되는 로직을 재사용할 때
      로그인 여부 확인, API 호출 상태 관리 등
    services/     // API 호출 로직
      백엔드 API 호출 담당
      프론트에서 직접 DB에 접근하지 않고 → 백엔드 API만 호출
    assets/       // 이미지, CSS, 아이콘
      이미지, CSS, 아이콘 등 정적 리소스
    utils/        // 공용 함수 (날짜 포맷, 숫자 변환 등)
      어디서든 쓸 수 있는 공용 함수
```

### 백엔드 (Python/FastAPI)
```
backend/
  app/
    routers/     // API 엔드포인트
      URL 경로에 해당하는 API 정의
      /login, /users, /posts 같은 엔드포인트
    services/    // 비즈니스 로직
      실제 기능(비즈니스 로직) 구현
      DB 조회, 비밀번호 해시, 조건 검사 등
    models/      // DB 모델
      DB 테이블 구조(SQLAlchemy) 정의
    schemas/     // 요청/응답 DTO
      요청/응답 데이터 형식(Pydantic) 정의
      “클라이언트가 보내는 JSON”과 “서버가 돌려주는 JSON”
    core/        // 설정, DB 연결, 보안
      환경설정, DB 연결, 보안 관련 코드
    utils/       // 공용 함수
      자주 쓰는 공용 함수
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
npm start

### 백엔드
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload


