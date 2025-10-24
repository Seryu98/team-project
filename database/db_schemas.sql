-- ===============================================
-- 🚀 team_project 통합 최신 버전 (2025-10-08 확정, boards 테이블 제거 버전)
-- ===============================================

DROP DATABASE IF EXISTS team_project;
CREATE DATABASE team_project CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE team_project;

CREATE USER 'team_user'@'%' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON team_project.* TO 'team_user'@'%';
FLUSH PRIVILEGES;

 
-- ===============================================
-- USERS
-- ===============================================
CREATE TABLE users (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '고유 사용자 식별자',
  nickname VARCHAR(100) NOT NULL COMMENT '사용자 닉네임',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
  email VARCHAR(255) NOT NULL COMMENT '이메일',
  user_id VARCHAR(255) NULL COMMENT '로컬 로그인 ID (소셜 로그인은 NULL 가능)',
  password_hash VARCHAR(255) NULL COMMENT '로컬 로그인 시 해시 비밀번호',
  auth_provider ENUM('LOCAL', 'GOOGLE', 'KAKAO', 'NAVER', 'GITHUB') NOT NULL DEFAULT 'LOCAL' COMMENT '인증 제공자',
  social_id VARCHAR(255) NULL COMMENT '소셜 로그인 고유 식별자',
  name VARCHAR(50) NOT NULL COMMENT '실제 이름',
  phone_number VARCHAR(20) NULL COMMENT '전화번호',
  role ENUM('MEMBER', 'ADMIN', 'GUEST', 'LEADER') NOT NULL DEFAULT 'MEMBER' COMMENT '권한 구분',
  status ENUM('ACTIVE', 'BANNED', 'DELETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태',
  last_login_at DATETIME NULL COMMENT '마지막 로그인 시각',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  reset_token VARCHAR(255) NULL COMMENT '비밀번호 재설정 토큰',
  reset_token_expire DATETIME NULL COMMENT '비밀번호 재설정 토큰 만료 시각',
  login_fail_count INT NOT NULL DEFAULT 0 COMMENT '로그인 실패 횟수',
  last_fail_time DATETIME NULL COMMENT '마지막 로그인 실패 시각',
  account_locked BOOLEAN NOT NULL DEFAULT FALSE COMMENT '계정 잠금 여부',
  banned_until DATETIME NULL COMMENT '정지 해제 예정일',
  is_tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '튜토리얼 완료 여부', -- ✅ 새 컬럼 포함
  PRIMARY KEY (id),
  CONSTRAINT uq_users_nickname UNIQUE (nickname),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_userid UNIQUE (user_id),
  CONSTRAINT uq_users_social UNIQUE (auth_provider, social_id)
);

-- ===============================================
-- PROFILES
-- ===============================================
CREATE TABLE profiles (
  id BIGINT NOT NULL COMMENT 'users.id 참조',
  profile_image VARCHAR(255) NULL COMMENT '프로필 이미지 URL',
  headline VARCHAR(200) NULL COMMENT '한 줄 소개',
  bio TEXT NULL COMMENT '자기소개',
  experience TEXT NULL COMMENT '경력',
  certifications TEXT NULL COMMENT '자격증',
  visibility JSON NULL COMMENT '필드별 공개 여부 설정 (birth_date, gender)',  -- ✅ 새 컬럼 포함
  birth_date DATE NULL COMMENT '생년월일',
  gender ENUM('MALE', 'FEMALE') NULL COMMENT '성별',
  following_count INT NOT NULL DEFAULT 0 COMMENT '팔로잉 수',
  follower_count INT NOT NULL DEFAULT 0 COMMENT '팔로워 수',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_profiles_user FOREIGN KEY (id) REFERENCES users (id)
);


-- ===============================================
-- SKILLS
-- ===============================================
CREATE TABLE skills (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '스킬 ID',
  name VARCHAR(100) NOT NULL COMMENT '스킬명',
  PRIMARY KEY (id),
  CONSTRAINT uq_skills_name UNIQUE (name)
);

-- Seed
INSERT INTO skills (name) VALUES
('C'), ('C++'), ('Rust'), ('Go'), ('Zig'), ('Java'), ('C#'), ('Kotlin'), ('Swift'), ('ObjectiveC'),
('Dart'), ('Scala'), ('Python'), ('Ruby'), ('Perl'), ('PHP'), ('Lua'), ('R'), ('JavaScript'), ('TypeScript'),
('HTML'), ('CSS'), ('SASS'), ('LESS'), ('NodeJS'), ('ExpressJS'), ('Spring'), ('Django'), ('Flask'), ('Laravel'),
('SQL'), ('MySQL'), ('PostgreSQL'), ('Oracle'), ('MSSQLServer'), ('SQLite'), ('MongoDB'), ('Redis'),
('MATLAB'), ('Julia'), ('SPSS'), ('Haskell'), ('F#'), ('Elixir'), ('Erlang'), ('OCaml'), ('Lisp'),
('Clojure'), ('Scheme'), ('Flutter'), ('React_Native'), ('Bash'), ('PowerShell'), ('Groovy'), ('JSON'), ('Markdown');


-- ===============================================
-- USER_SKILLS
-- ===============================================
CREATE TABLE user_skills (
  user_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  level DECIMAL(2,1) NOT NULL COMMENT '숙련도 (1.0~5.0)',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT FK_user_skills_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT FK_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id),
  CONSTRAINT chk_level_range CHECK (level BETWEEN 1.0 AND 5.0)
);


-- ===============================================
-- POSTS / 관련 테이블
-- ===============================================
CREATE TABLE posts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  leader_id BIGINT NOT NULL,
  type ENUM('PROJECT', 'STUDY') NOT NULL,
  title VARCHAR(200) NOT NULL,
  field VARCHAR(100) NULL,
  image_url VARCHAR(255) NULL,
  capacity INT NOT NULL,
  current_members INT DEFAULT 0,
  description TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  recruit_status ENUM('OPEN','CLOSED') DEFAULT 'OPEN',
  project_status ENUM('ONGOING','ENDED') DEFAULT 'ONGOING',
  project_start DATE NULL,
  project_end DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT FK_posts_user FOREIGN KEY (leader_id) REFERENCES users (id)
);

CREATE TABLE post_skills (
  post_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  PRIMARY KEY (post_id, skill_id),
  CONSTRAINT FK_post_skills_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_post_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id)
);

CREATE TABLE post_members (
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role ENUM('MEMBER', 'LEADER') DEFAULT 'MEMBER',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT FK_post_members_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_post_members_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- ===============================================
-- APPLICATIONS / ANSWERS / 필수항목
-- ===============================================
CREATE TABLE applications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT FK_applications_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_applications_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE application_fields (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
);

INSERT INTO application_fields (name) VALUES
('이메일'), ('지원사유'), ('성별'), ('나이'),
('자기소개'), ('경험/경력설명'),
('직장인/취준생여부'), ('다룰 수 있는 언어/프로그램'),
('투자가능한 시간(1주당)'), ('궁금한 점'), ('자유기재');

CREATE TABLE application_answers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  application_id BIGINT NOT NULL,
  field_id BIGINT NOT NULL,
  answer_text TEXT NOT NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE (application_id, field_id),
  CONSTRAINT FK_application_answers_application FOREIGN KEY (application_id) REFERENCES applications (id),
  CONSTRAINT FK_application_answers_field FOREIGN KEY (field_id) REFERENCES application_fields (id)
);

CREATE TABLE post_required_fields (
  post_id BIGINT NOT NULL,
  field_id BIGINT NOT NULL,
  PRIMARY KEY (post_id, field_id),
  CONSTRAINT FK_post_required_fields_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_post_required_fields_field FOREIGN KEY (field_id) REFERENCES application_fields (id)
);


-- ===============================================
-- FILES / ANNOUNCEMENTS
-- ===============================================
CREATE TABLE files (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT FK_files_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_files_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE announcements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  admin_id BIGINT NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_announcements_admin FOREIGN KEY (admin_id) REFERENCES users (id)
);

CREATE TABLE announcement_reads (
  id BIGINT NOT NULL AUTO_INCREMENT,
  announcement_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_announcement_reads_announcement FOREIGN KEY (announcement_id) REFERENCES announcements (id),
  CONSTRAINT fk_announcement_reads_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- ===============================================
-- BOARDS / 게시판 구조 (boards 테이블 제거)
-- ===============================================
CREATE TABLE categories (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_categories_name UNIQUE (name)
);

-- ✅ Seed 데이터
INSERT INTO categories (name) VALUES
('홍보글'), ('잡담글'), ('자랑글'), ('질문&답변'), ('정보공유');

CREATE TABLE board_posts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  -- ✅ board_id 제거
  category_id BIGINT NULL,
  author_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  attachment_url VARCHAR(255) NULL,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  status ENUM('VISIBLE','HIDDEN','DELETED') DEFAULT 'VISIBLE',
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT FK_board_posts_author FOREIGN KEY (author_id) REFERENCES users (id),
  CONSTRAINT FK_board_posts_category FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE board_post_likes (
  board_post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (board_post_id, user_id),
  CONSTRAINT FK_board_post_likes_post FOREIGN KEY (board_post_id) REFERENCES board_posts (id) ON DELETE CASCADE,
  CONSTRAINT FK_board_post_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE board_post_views (
  id BIGINT NOT NULL AUTO_INCREMENT,
  board_post_id BIGINT NOT NULL,
  viewer_id BIGINT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT FK_board_post_views_post FOREIGN KEY (board_post_id) REFERENCES board_posts (id) ON DELETE CASCADE
);

CREATE TABLE hot3_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    target_date DATETIME NOT NULL COMMENT 'KST 자정 기준 날짜 (YYYY-MM-DD)',
    board_post_id BIGINT NOT NULL,
    recent_views INT NOT NULL DEFAULT 0,
    recent_likes INT NOT NULL DEFAULT 0,
    hot_score FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hot3_post FOREIGN KEY (board_post_id)
        REFERENCES board_posts(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ===============================================
-- COMMENTS / REPORTS / 기타 관리 테이블
-- ===============================================
CREATE TABLE comments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NULL,
  board_post_id BIGINT NULL,
  user_id BIGINT NOT NULL,
  parent_id BIGINT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  status ENUM('VISIBLE','HIDDEN','DELETED') DEFAULT 'VISIBLE',
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT FK_comments_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT FK_comments_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_comments_board_post FOREIGN KEY (board_post_id) REFERENCES board_posts (id),
  CONSTRAINT FK_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE,
  CONSTRAINT chk_comment_target CHECK (
    (post_id IS NOT NULL AND board_post_id IS NULL) OR
    (post_id IS NULL AND board_post_id IS NOT NULL)
  )
);

CREATE TABLE reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  reported_user_id BIGINT NOT NULL,
  reporter_user_id BIGINT NOT NULL,
  target_type ENUM('POST','BOARD_POST','COMMENT','USER','MESSAGE') NOT NULL,
  target_id BIGINT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('PENDING','RESOLVED','REJECTED') DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT FK_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users (id),
  CONSTRAINT FK_reports_reporter_user FOREIGN KEY (reporter_user_id) REFERENCES users (id),
  UNIQUE (reporter_user_id, target_type, target_id)
);


-- ===============================================
-- FOLLOW / NOTIFICATION / MESSAGE / WARNING
-- ===============================================
CREATE TABLE follows (
  follower_id BIGINT NOT NULL,
  following_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT FK_follows_follower FOREIGN KEY (follower_id) REFERENCES users (id),
  CONSTRAINT FK_follows_following FOREIGN KEY (following_id) REFERENCES users (id),
  CONSTRAINT chk_follows_self CHECK (follower_id <> following_id)
);

CREATE TABLE notifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type ENUM(
    'FOLLOW','APPLICATION','APPLICATION_ACCEPTED','APPLICATION_REJECTED',
    'WARNING','BAN','UNBAN','MESSAGE',
    'REPORT_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED'
  ) NOT NULL,
  message VARCHAR(255) NOT NULL,
  related_id BIGINT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  redirect_path VARCHAR(255) NULL COMMENT '알림 클릭 시 이동 경로',
  PRIMARY KEY (id),
  CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
);

ALTER TABLE notifications
ADD COLUMN category ENUM('NORMAL','NOTICE','ADMIN') DEFAULT 'NORMAL'
COMMENT '알림 카테고리 (NORMAL / NOTICE / ADMIN)';

CREATE TABLE messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  category ENUM('NORMAL','NOTICE','ADMIN') DEFAULT 'NORMAL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  CONSTRAINT FK_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
  CONSTRAINT FK_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id)
);

ALTER TABLE messages 
ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '쪽지 삭제 여부 (1=삭제됨)';


CREATE TABLE report_actions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  report_id BIGINT NOT NULL,
  admin_id BIGINT NOT NULL,
  action ENUM('RESOLVE','REJECT','ESCALATE') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ra_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE message_user_status (
  message_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at DATETIME NULL,
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT fk_mus_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_mus_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_warnings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  admin_id BIGINT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_uw_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_uw_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);


-- ===============================================
-- 기본 프로필 이미지 경로 설정
-- ===============================================
ALTER TABLE profiles
MODIFY profile_image VARCHAR(255)
DEFAULT '/assets/profile/default_profile.png';


-- 재신청 무제한 + 24h 쿨타임 적용 마이그레이션
-- 1) applications.status ENUM에 WITHDRAWN 추가
ALTER TABLE applications
  MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED','WITHDRAWN')
  NOT NULL;

-- 2) 상태 변경 시각(UTC) 추적 컬럼 추가
ALTER TABLE applications
  ADD COLUMN status_changed_at DATETIME NULL;

-- 만약 에러가 나오면 워크벤치 설정에 안전모드때문에 그런거니깐 임시로 껐다 키면됨 아래 SET 써서 
SET SQL_SAFE_UPDATES = 0;
-- 3) 기존 데이터 보정: status_changed_at 없으면 created_at으로 채움
UPDATE applications
SET status_changed_at = IFNULL(status_changed_at, created_at);
SET SQL_SAFE_UPDATES = 1;

-- 4) 조회 최적화 인덱스 (쿨타임 계산)
CREATE INDEX idx_app_user_post_status_changed
  ON applications (user_id, post_id, status_changed_at);

-- 상세페이지 멤버 프로필사진때문에 fk연결이필요
ALTER TABLE profiles
ADD CONSTRAINT fk_profiles_user_id
FOREIGN KEY (id) REFERENCES users(id)
ON DELETE CASCADE;

-- kicked상태 추가해서 리더가 유저 제외
ALTER TABLE applications 
MODIFY COLUMN status 
ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'KICKED') 
NOT NULL DEFAULT 'PENDING';


-- 공지사항 컬럼 추가
ALTER TABLE notifications
MODIFY COLUMN type ENUM(
  'FOLLOW',
  'APPLICATION',
  'APPLICATION_ACCEPTED',
  'APPLICATION_REJECTED',
  'WARNING',
  'BAN',
  'UNBAN',
  'MESSAGE',
  'REPORT_RECEIVED',
  'REPORT_RESOLVED',
  'REPORT_REJECTED',
  'ADMIN_NOTICE'  -- ✅ 오늘 추가된 타입
) NOT NULL;


--메세지 컬럼 추가 (메세지함 소프트 삭제)
ALTER TABLE messages 
ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '쪽지 삭제 여부 (1=삭제됨)';
