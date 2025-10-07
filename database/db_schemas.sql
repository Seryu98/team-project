-- ===============================================
-- 🚀 team_project 통합 최신 버전 (2025-10-07)
-- ===============================================

-- 기존 DB 삭제
DROP DATABASE IF EXISTS team_project;

-- 새로 생성
CREATE DATABASE team_project CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE team_project;

-- 공통 아이디 / 비밀번호 생성
CREATE USER 'team_user'@'%' IDENTIFIED BY '1234';

-- 권한 부여 (모든 테이블 접근 허용)
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
  auth_provider ENUM('LOCAL', 'GOOGLE', 'KAKAO', 'NAVER', 'GITHUB') 
      NOT NULL DEFAULT 'LOCAL' COMMENT '인증 제공자',
  social_id VARCHAR(255) NULL COMMENT '소셜 로그인 고유 식별자',
  name VARCHAR(50) NOT NULL COMMENT '실제 이름',
  phone_number VARCHAR(20) NULL COMMENT '전화번호',
  role ENUM('MEMBER', 'ADMIN', 'GUEST', 'LEADER') 
      NOT NULL DEFAULT 'MEMBER' COMMENT '권한 구분',
  status ENUM('ACTIVE', 'BANNED', 'DELETED') 
      NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태',
  last_login_at DATETIME NULL COMMENT '마지막 로그인 시각',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  reset_token VARCHAR(255) NULL COMMENT '비밀번호 재설정 토큰 (LOCAL 전용)',
  reset_token_expire DATETIME NULL COMMENT '비밀번호 재설정 토큰 만료 시각 (LOCAL 전용)',
  login_fail_count INT NOT NULL DEFAULT 0 COMMENT '로그인 실패 횟수 누적',
  last_fail_time DATETIME NULL COMMENT '마지막 로그인 실패 시각',
  account_locked BOOLEAN NOT NULL DEFAULT FALSE COMMENT '계정 잠금 여부',
  banned_until DATETIME NULL COMMENT '정지 해제 예정일',
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
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '고유 스킬ID',
  name VARCHAR(100) NOT NULL COMMENT '스킬명',
  PRIMARY KEY (id),
  CONSTRAINT uq_skills_name UNIQUE (name)
);

-- SKILLS Seed Data
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
  user_id BIGINT NOT NULL COMMENT '유저 ID',
  skill_id BIGINT NOT NULL COMMENT '스킬 ID',
  level DECIMAL(2,1) NOT NULL COMMENT '숙련도 (1.0 ~ 5.0)',
  PRIMARY KEY (user_id, skill_id),
  CONSTRAINT FK_user_skills_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT FK_user_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id),
  CONSTRAINT chk_level_range CHECK (level >= 1.0 AND level <= 5.0)
);


-- ===============================================
-- POSTS
-- ===============================================
CREATE TABLE posts (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시글 ID',
  leader_id BIGINT NOT NULL COMMENT '리더 ID',
  type ENUM('PROJECT', 'STUDY') NOT NULL COMMENT '게시글 유형',
  title VARCHAR(200) NOT NULL COMMENT '제목',
  field VARCHAR(100) NULL COMMENT '분야',
  image_url VARCHAR(255) NULL COMMENT '대표 이미지 URL',
  capacity INT NOT NULL COMMENT '모집 정원(>0)',
  current_members INT NOT NULL DEFAULT 0 COMMENT '현재 참여 인원',
  description TEXT NULL COMMENT '프로젝트 설명 / 스터디 소개',
  start_date DATE NULL COMMENT '모집 시작일',
  end_date DATE NULL COMMENT '모집 종료일',
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '승인 상태',
  recruit_status ENUM('OPEN','CLOSED') DEFAULT 'OPEN' COMMENT '모집 상태',
  project_status ENUM('ONGOING','ENDED') NOT NULL DEFAULT 'ONGOING' COMMENT '프로젝트 진행 상태',
  project_start DATE NULL COMMENT '프로젝트 시작일',
  project_end DATE NULL COMMENT '프로젝트 종료일',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_posts_user FOREIGN KEY (leader_id) REFERENCES users (id),
  CONSTRAINT chk_capacity CHECK (capacity > 0)
);


-- ===============================================
-- POST_SKILLS
-- ===============================================
CREATE TABLE post_skills (
  post_id BIGINT NOT NULL COMMENT '게시글 ID',
  skill_id BIGINT NOT NULL COMMENT '스킬 ID',
  PRIMARY KEY (post_id, skill_id),
  CONSTRAINT FK_post_skills_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_post_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id)
);


-- ===============================================
-- POST_MEMBERS
-- ===============================================
CREATE TABLE post_members (
  post_id BIGINT NOT NULL COMMENT '게시글 ID',
  user_id BIGINT NOT NULL COMMENT '유저 ID',
  role ENUM('MEMBER', 'LEADER') NOT NULL DEFAULT 'MEMBER' COMMENT '역할',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT FK_post_members_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_post_members_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- ===============================================
-- APPLICATIONS
-- ===============================================
CREATE TABLE applications (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '지원서 ID',
  post_id BIGINT NOT NULL COMMENT '게시글 ID',
  user_id BIGINT NOT NULL COMMENT '지원자 ID',
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '상태',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '지원일',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_applications_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_applications_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- ===============================================
-- APPLICATION_FIELDS
-- ===============================================
CREATE TABLE application_fields (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '필드 ID',
  name VARCHAR(100) NOT NULL COMMENT '질문 항목',
  PRIMARY KEY (id)
);

-- Seed Data
INSERT INTO application_fields (name) VALUES
('이메일'), ('지원사유'), ('성별'), ('나이'),
('자기소개'), ('경험/경력설명'),
('직장인/취준생여부'), ('다룰 수 있는 언어/프로그램'),
('투자가능한 시간(1주당)'), ('궁금한 점'), ('자유기재');


-- ===============================================
-- APPLICATION_ANSWERS
-- ===============================================
CREATE TABLE application_answers (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '답변 ID',
  application_id BIGINT NOT NULL COMMENT '지원서 ID',
  field_id BIGINT NOT NULL COMMENT '필드 ID',
  answer_text TEXT NOT NULL COMMENT '답변',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  UNIQUE (application_id, field_id),
  CONSTRAINT FK_application_answers_application FOREIGN KEY (application_id) REFERENCES applications (id),
  CONSTRAINT FK_application_answers_field FOREIGN KEY (field_id) REFERENCES application_fields (id)
);


-- ===============================================
-- POST_REQUIRED_FIELDS
-- ===============================================
CREATE TABLE post_required_fields (
  post_id BIGINT NOT NULL COMMENT '게시글 ID',
  field_id BIGINT NOT NULL COMMENT '필수 질문 ID',
  PRIMARY KEY (post_id, field_id),
  CONSTRAINT FK_post_required_fields_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_post_required_fields_field FOREIGN KEY (field_id) REFERENCES application_fields (id)
);


-- ===============================================
-- FILES
-- ===============================================
CREATE TABLE files (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '파일 ID',
  post_id BIGINT NULL COMMENT '프로젝트/스터디 ID',
  user_id BIGINT NOT NULL COMMENT '업로더 ID',
  file_url VARCHAR(255) NOT NULL COMMENT '파일 경로/URL',
  file_type VARCHAR(50) NULL COMMENT '파일 타입',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '업로드 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_files_post FOREIGN KEY (post_id) REFERENCES posts (id),
  CONSTRAINT FK_files_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- ===============================================
-- ANNOUNCEMENTS / READS / BOARDS / CATEGORIES
-- ===============================================
CREATE TABLE announcements (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '공지사항 ID',
  admin_id BIGINT NOT NULL COMMENT '작성자 (관리자) ID',
  title VARCHAR(100) NOT NULL COMMENT '공지 제목',
  content TEXT NOT NULL COMMENT '공지 내용',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '공지 작성일',
  PRIMARY KEY (id),
  CONSTRAINT fk_announcements_admin FOREIGN KEY (admin_id) REFERENCES users (id)
);

CREATE TABLE announcement_reads (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '읽음 ID',
  announcement_id BIGINT NOT NULL COMMENT '공지사항 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  is_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT '읽음 여부',
  read_at DATETIME NULL COMMENT '읽은 시각',
  PRIMARY KEY (id),
  CONSTRAINT fk_announcement_reads_announcement FOREIGN KEY (announcement_id) REFERENCES announcements (id),
  CONSTRAINT fk_announcement_reads_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE boards (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시판 ID',
  name VARCHAR(100) NOT NULL COMMENT '게시판 이름',
  description VARCHAR(255) NULL COMMENT '게시판 설명',
  PRIMARY KEY (id)
);

CREATE TABLE categories (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '카테고리 ID',
  name VARCHAR(100) NOT NULL COMMENT '카테고리명',
  PRIMARY KEY (id),
  CONSTRAINT uq_categories_name UNIQUE (name)
) COMMENT '게시판 글 카테고리';

-- Seed Data
INSERT INTO categories (name) VALUES
('잡담'), ('홍보'), ('질문&답변');


-- ===============================================
-- BOARD_POSTS
-- ===============================================
CREATE TABLE board_posts (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시판 글 ID',
  board_id BIGINT NOT NULL COMMENT '게시판 ID',
  category_id BIGINT NULL COMMENT '카테고리 ID (필터 기능용)',
  author_id BIGINT NOT NULL COMMENT '작성자 ID',
  title VARCHAR(200) NOT NULL COMMENT '제목',
  content TEXT NOT NULL COMMENT '내용',
  attachment_url VARCHAR(255) NULL COMMENT '첨부파일 경로 (파일첨부 기능용)',
  view_count INT NOT NULL DEFAULT 0 COMMENT '조회수',
  like_count INT NOT NULL DEFAULT 0 COMMENT '추천수',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성일',
  updated_at DATETIME NULL COMMENT '수정일',
  status ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE' COMMENT '상태',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_board_posts_board FOREIGN KEY (board_id) REFERENCES boards (id),
  CONSTRAINT FK_board_posts_author FOREIGN KEY (author_id) REFERENCES users (id),
  CONSTRAINT FK_board_posts_category FOREIGN KEY (category_id) REFERENCES categories (id)
);


-- ===============================================
-- BOARD_POST_LIKES
-- ===============================================
CREATE TABLE board_post_likes (
  board_post_id BIGINT NOT NULL COMMENT '게시판 글 ID',
  user_id BIGINT NOT NULL COMMENT '추천한 사용자 ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '추천일',
  PRIMARY KEY (board_post_id, user_id),
  CONSTRAINT FK_board_post_likes_post FOREIGN KEY (board_post_id) REFERENCES board_posts (id) ON DELETE CASCADE,
  CONSTRAINT FK_board_post_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) COMMENT '게시판 글 추천 기록';


-- ===============================================
-- COMMENTS
-- ===============================================
CREATE TABLE comments (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '댓글 ID',
  post_id BIGINT NULL COMMENT '프로젝트/스터디 ID',
  board_post_id BIGINT NULL COMMENT '게시판 글 ID',
  user_id BIGINT NOT NULL COMMENT '작성자 ID',
  parent_id BIGINT NULL COMMENT '부모 댓글 ID',
  content TEXT NOT NULL COMMENT '내용',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성일',
  updated_at DATETIME NULL COMMENT '수정일',
  status ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE' COMMENT '상태',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
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


-- ===============================================
-- REPORTS
-- ===============================================
CREATE TABLE reports (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '신고 ID',
  reported_user_id BIGINT NOT NULL COMMENT '피신고자 ID',
  reporter_user_id BIGINT NOT NULL COMMENT '신고자 ID',
  target_type ENUM('POST', 'BOARD_POST', 'COMMENT', 'USER') NOT NULL COMMENT '대상 타입',
  target_id BIGINT NOT NULL COMMENT '대상 ID',
  reason VARCHAR(255) NOT NULL COMMENT '신고 사유',
  status ENUM('PENDING', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '상태',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '신고일',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users (id),
  CONSTRAINT FK_reports_reporter_user FOREIGN KEY (reporter_user_id) REFERENCES users (id),
  UNIQUE (reporter_user_id, target_type, target_id)
);


-- ===============================================
-- FOLLOWS
-- ===============================================
CREATE TABLE follows (
  follower_id BIGINT NOT NULL COMMENT '팔로우 하는 사용자',
  following_id BIGINT NOT NULL COMMENT '팔로우 당하는 사용자',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '팔로우 시작일',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT FK_follows_follower FOREIGN KEY (follower_id) REFERENCES users (id),
  CONSTRAINT FK_follows_following FOREIGN KEY (following_id) REFERENCES users (id),
  CONSTRAINT chk_follows_self CHECK (follower_id <> following_id)
);


-- ===============================================
-- NOTIFICATIONS
-- ===============================================
CREATE TABLE notifications (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '알림 ID',
  user_id BIGINT NOT NULL COMMENT '알림을 받는 사용자 ID',
  type ENUM(
    'FOLLOW','APPLICATION','APPLICATION_ACCEPTED','APPLICATION_REJECTED',
    'WARNING','BAN','UNBAN','MESSAGE',
    'REPORT_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED'
  ) NOT NULL COMMENT '알림 유형',
  message VARCHAR(255) NOT NULL COMMENT '알림 메시지',
  related_id BIGINT NULL COMMENT '연관된 엔티티 ID',
  is_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT '읽음 여부',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '알림 생성 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
);


-- ===============================================
-- MESSAGES
-- ===============================================
CREATE TABLE messages (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '쪽지 ID',
  sender_id BIGINT NOT NULL COMMENT '보낸 사용자 ID',
  receiver_id BIGINT NOT NULL COMMENT '받는 사용자 ID',
  content TEXT NOT NULL COMMENT '쪽지 내용',
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '읽음 여부',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '전송 시각',
  deleted_at DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (id),
  CONSTRAINT FK_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
  CONSTRAINT FK_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id)
);


-- ===============================================
-- REPORT_ACTIONS
-- ===============================================
CREATE TABLE report_actions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  report_id BIGINT NOT NULL,
  admin_id BIGINT NOT NULL,
  action ENUM('RESOLVE','REJECT','ESCALATE') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ra_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_ra_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);


-- ===============================================
-- MESSAGE_USER_STATUS
-- ===============================================
CREATE TABLE message_user_status (
  message_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at DATETIME NULL,
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT fk_mus_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_mus_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ===============================================
-- USER_WARNINGS
-- ===============================================
CREATE TABLE user_warnings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '경고 대상 사용자',
  admin_id BIGINT NOT NULL COMMENT '처리한 관리자',
  reason VARCHAR(255) NOT NULL COMMENT '경고 사유',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '경고 시각',
  PRIMARY KEY (id),
  CONSTRAINT fk_uw_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_uw_admin FOREIGN KEY (admin_id) REFERENCES users(id)
);