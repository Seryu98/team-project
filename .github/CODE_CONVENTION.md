## 🎨 코드 컨벤션
### 파일명 네이밍 규칙
- React 컴포넌트: PascalCase → UserProfile.jsx
- React hooks: use + camelCase → useAuth.js
- Python 파일: snake_case → user_service.py
- Python 클래스: PascalCase → UserService
- DB 테이블/컬럼: snake_case → users, user_id

## 🎨 코드 스타일

- **React**
  - 들여쓰기: 2 space  
  - 따옴표: double quotes (`"..."`) 사용  
  - 세미콜론(`;`) 필수 (자동 누락 방지)  
  - 컴포넌트: **함수형 컴포넌트**만 사용  
  - props는 명시적으로 작성 → `UserCard({ name, age })`  
  - import 순서: **React → 외부 라이브러리 → 내부 파일**  
  - JSX에서 태그는 꼭 닫기  
  ```jsx 예시
  import React from "react";
  import UserCard from "../components/UserCard";

  function UserProfile() {
    return (
      <div>
        <UserCard name="홍길동" />
      </div>
    );
  }

  export default UserProfile;
  ```

---

- **Python**
  - PEP8 준수  
    - 들여쓰기: 4칸 (space 4개)  
    - 한 줄 길이: 79자 이내 권장  
    - 함수/변수: `snake_case` (예: `get_user_info`)  
    - 클래스: `PascalCase` (예: `UserProfile`)  
    - 상수: `UPPER_CASE` (예: `MAX_RETRY`)  
  - 함수는 **50줄 이내**, 한 함수는 **한 기능만 담당**  가독성증가, 수정할때 좋음
  - `print()` 대신 `logging` 사용  
    - `print()`는 콘솔에만 단순 출력 → 실제 서비스에선 로그가 남지 않음
    - `logging.debug()` → 디버깅용  
    - `logging.info()` → 일반 정보  
    - `logging.warning()` → 경고  
    - `logging.error()` → 오류 발생  
    - `logging.critical()` → 심각한 오류 
    - 이렇게 하면 콘솔에도 나오고, 필요시 로그 파일로 저장해서 운영 시 문제가 생겼을 때 추적 가능. 
  ```python 예시
  import logging
  logging.basicConfig(level=logging.INFO)

  def login(user):
      logging.info("로그인 시도: %s", user)
      if user == "admin":
          logging.info("로그인 성공")
      else:
          logging.warning("로그인 실패")
  ```

---

- **SQL**
  - 키워드: 대문자 사용 (`SELECT`, `FROM`, `WHERE`)  
  - 테이블/컬럼명: 소문자 + snake_case (`users`, `user_id`)  
  - `SELECT *` 금지 → 필요한 컬럼만 명시  
  - `created_at`, `updated_at` 컬럼은 기본 포함  
  - JOIN 시 반드시 `ON` 조건 명시  
  - 각 컬럼은 `COMMENT`로 설명 추가  
  ```sql 예시
  CREATE TABLE users (
      user_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 ID',
      email VARCHAR(50) NOT NULL COMMENT '이메일 주소',
      password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
  );

  SELECT user_id, email
  FROM users
  WHERE user_id = 1;
  ```

---

## 💬 커밋 규칙(커밋버튼누르기전에 summery에 작성하는구조)
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

## 브랜치명 규칙
- 새로운 기능: feature/기능이름 → feature/auth-login, feature post-create
- 버그 수정: fix/버그설명 → fix/login-token
- 문서 작업: docs/문서이름

---

## 📡 API 규칙(프론트엔드 개발자가 백엔드 API를 호출할 때)
- RESTful 원칙 준수 → API URL을 일관성 있게 작성하기 위함
- 예시
- /users (회원 전체 조회/등록)
- /users/{id} (회원 단일 조회/수정/삭제)
- /users/{id}/posts (특정 회원의 게시글)

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
