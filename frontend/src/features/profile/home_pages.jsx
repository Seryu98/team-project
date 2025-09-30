import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>메인 페이지</h1>
      <nav>
        <ul>
          <li><Link to="/profile/create">프로필 생성</Link></li>
          <li><Link to="/profile/21">내 프로필 확인/수정</Link></li>
          <li><Link to="/profile/23">민준 프로필 보기</Link></li>
        </ul>
      </nav>
    </div>
  );
}
