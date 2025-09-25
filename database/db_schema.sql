/*mysql에서 이렇게 작성하면 여기 스크립트가 그대로 작성되서 실행되고 
테이블 생성됨
mysql -u team_user -p team_project < database/db_schema.sql
*/


-- USERS
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '고유 사용자 식별자',
  `nickname` VARCHAR(100) NOT NULL COMMENT '사용자 닉네임',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
  `email` VARCHAR(255) NOT NULL COMMENT '이메일',
  `user_id` VARCHAR(255) NOT NULL COMMENT '로그인 ID',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '해시 비밀번호',
  `name` VARCHAR(50) NOT NULL COMMENT '실제 이름',
  `phone_number` VARCHAR(20) NULL COMMENT '전화번호',
  `role` ENUM('MEMBER', 'ADMIN', 'GUEST', 'LEADER') NOT NULL DEFAULT 'MEMBER' COMMENT '권한 구분',
  `status` ENUM('ACTIVE', 'BANNED', 'DELETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태',
  `last_login_at` DATETIME NULL COMMENT '마지막 로그인 시각',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  `reset_token` VARCHAR(255) NULL COMMENT '비밀번호 재설정 토큰',
  `reset_token_expire` DATETIME NULL COMMENT '비밀번호 재설정 토큰 만료 시각',
  `login_fail_count` INT NOT NULL DEFAULT 0 COMMENT '로그인 실패 횟수 누적',
  `last_fail_time` DATETIME NULL COMMENT '마지막 로그인 실패 시각',
  `account_locked` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '계정 잠금 여부',
  PRIMARY KEY (`id`),
  CONSTRAINT uq_users_nickname UNIQUE (`nickname`),
  CONSTRAINT uq_users_email UNIQUE (`email`),
  CONSTRAINT uq_users_userid UNIQUE (`user_id`)
);

-- PROFILES
CREATE TABLE `profiles` (
  `id` BIGINT NOT NULL COMMENT 'users.id 참조',
  `profile_image` VARCHAR(255) NULL COMMENT '프로필 이미지 URL',
  `headline` VARCHAR(200) NULL COMMENT '한 줄 소개',
  `bio` TEXT NULL COMMENT '자기소개',
  `experience` TEXT NULL COMMENT '경력',
  `certifications` TEXT NULL COMMENT '자격증',
  `birth_date` DATE NULL COMMENT '생년월일',
  `gender` ENUM('MALE', 'FEMALE') NULL COMMENT '성별',
  `following_count` INT NOT NULL DEFAULT 0 COMMENT '팔로잉 수',
  `follower_count` INT NOT NULL DEFAULT 0 COMMENT '팔로워 수',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_profiles_user` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
);

-- SKILLS
CREATE TABLE `skills` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '고유 스킬ID',
  `name` VARCHAR(100) NOT NULL COMMENT '스킬명',
  PRIMARY KEY (`id`),
  CONSTRAINT uq_skills_name UNIQUE (`name`)
);

-- USER_SKILLS
CREATE TABLE `user_skills` (
  `user_id` BIGINT NOT NULL COMMENT '유저 ID',
  `skill_id` BIGINT NOT NULL COMMENT '스킬 ID',
  `proficiency` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT') NOT NULL DEFAULT 'BEGINNER' COMMENT '숙련도',
  PRIMARY KEY (`user_id`, `skill_id`),
  CONSTRAINT `FK_user_skills_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_user_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`)
);

-- POSTS
CREATE TABLE `posts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시글 ID',
  `leader_id` BIGINT NOT NULL COMMENT '리더 ID',
  `type` ENUM('PROJECT', 'STUDY') NOT NULL COMMENT '게시글 유형',
  `title` VARCHAR(200) NOT NULL COMMENT '제목',
  `field` VARCHAR(100) NULL COMMENT '분야',
  `image_url` VARCHAR(255) NULL COMMENT '대표 이미지 URL',
  `capacity` INT NOT NULL COMMENT '모집 정원(>0)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_posts_user` FOREIGN KEY (`leader_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_capacity` CHECK (`capacity` > 0)
);

-- PROJECT_DETAILS
CREATE TABLE `project_details` (
  `post_id` BIGINT NOT NULL COMMENT '게시글 ID',
  `description` TEXT NULL COMMENT '설명',
  `goal` TEXT NULL COMMENT '목표',
  `process` VARCHAR(200) NULL COMMENT '진행 방식',
  `expectations` TEXT NULL COMMENT '기대 효과',
  `etc` TEXT NULL COMMENT '기타',
  PRIMARY KEY (`post_id`),
  CONSTRAINT `FK_project_details_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
);

-- STUDY_DETAILS
CREATE TABLE `study_details` (
  `post_id` BIGINT NOT NULL COMMENT '게시글 ID',
  `description` TEXT NULL COMMENT '설명',
  `goal` TEXT NULL COMMENT '목표',
  `requirements` TEXT NULL COMMENT '요구 사항',
  `process` VARCHAR(200) NULL COMMENT '진행 방식',
  `etc` TEXT NULL COMMENT '기타',
  PRIMARY KEY (`post_id`),
  CONSTRAINT `FK_study_details_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
);

-- POST_MEMBERS
CREATE TABLE `post_members` (
  `post_id` BIGINT NOT NULL COMMENT '게시글 ID',
  `user_id` BIGINT NOT NULL COMMENT '유저 ID',
  `role` ENUM('MEMBER', 'LEADER') NOT NULL DEFAULT 'MEMBER' COMMENT '역할',
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`post_id`, `user_id`),
  CONSTRAINT `FK_post_members_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`),
  CONSTRAINT `FK_post_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- APPLICATIONS
CREATE TABLE `applications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '지원서 ID',
  `post_id` BIGINT NOT NULL COMMENT '게시글 ID',
  `user_id` BIGINT NOT NULL COMMENT '지원자 ID',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '상태',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '지원일',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_applications_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`),
  CONSTRAINT `FK_applications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- APPLICATION_FIELDS
CREATE TABLE `application_fields` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '필드 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '질문 항목',
  PRIMARY KEY (`id`)
);

-- APPLICATION_ANSWERS
CREATE TABLE `application_answers` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '답변 ID',
  `application_id` BIGINT NOT NULL COMMENT '지원서 ID',
  `field_id` BIGINT NOT NULL COMMENT '필드 ID',
  `answer_text` TEXT NOT NULL COMMENT '답변',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_application_answers_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`),
  CONSTRAINT `FK_application_answers_field` FOREIGN KEY (`field_id`) REFERENCES `application_fields` (`id`),
  UNIQUE (`application_id`, `field_id`)
);

-- POST_REQUIRED_FIELDS
CREATE TABLE `post_required_fields` (
  `post_id` BIGINT NOT NULL COMMENT '게시글 ID',
  `field_id` BIGINT NOT NULL COMMENT '필수 질문 ID',
  PRIMARY KEY (`post_id`, `field_id`),
  CONSTRAINT `FK_post_required_fields_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`),
  CONSTRAINT `FK_post_required_fields_field` FOREIGN KEY (`field_id`) REFERENCES `application_fields` (`id`)
);

-- BOARDS
CREATE TABLE `boards` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시판 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '게시판 이름',
  `description` VARCHAR(255) NULL COMMENT '게시판 설명',
  PRIMARY KEY (`id`)
);

-- BOARD_POSTS
CREATE TABLE `board_posts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시판 글 ID',
  `board_id` BIGINT NOT NULL COMMENT '게시판 ID',
  `author_id` BIGINT NOT NULL COMMENT '작성자 ID',
  `title` VARCHAR(200) NOT NULL COMMENT '제목',
  `content` TEXT NOT NULL COMMENT '내용',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성일',
  `updated_at` DATETIME NULL COMMENT '수정일',
  `status` ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE' COMMENT '상태',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_board_posts_board` FOREIGN KEY (`board_id`) REFERENCES `boards` (`id`),
  CONSTRAINT `FK_board_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
);

-- COMMENTS
CREATE TABLE `comments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '댓글 ID',
  `post_id` BIGINT NULL COMMENT '프로젝트/스터디 ID',
  `board_post_id` BIGINT NULL COMMENT '게시판 글 ID',
  `user_id` BIGINT NOT NULL COMMENT '작성자 ID',
  `parent_id` BIGINT NULL COMMENT '부모 댓글 ID',
  `content` TEXT NOT NULL COMMENT '내용',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '작성일',
  `updated_at` DATETIME NULL COMMENT '수정일',
  `status` ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE' COMMENT '상태',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_comments_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`),
  CONSTRAINT `FK_comments_board_post` FOREIGN KEY (`board_post_id`) REFERENCES `board_posts` (`id`),
  CONSTRAINT `FK_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_comment_target` CHECK (
    (`post_id` IS NOT NULL AND `board_post_id` IS NULL) OR
    (`post_id` IS NULL AND `board_post_id` IS NOT NULL)
  )
);

-- REPORTS
CREATE TABLE `reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '신고 ID',
  `reported_user_id` BIGINT NOT NULL COMMENT '피신고자 ID',
  `reporter_user_id` BIGINT NOT NULL COMMENT '신고자 ID',
  `target_type` ENUM('POST', 'BOARD_POST', 'COMMENT', 'USER') NOT NULL COMMENT '대상 타입',
  `target_id` BIGINT NOT NULL COMMENT '대상 ID',
  `reason` VARCHAR(255) NOT NULL COMMENT '신고 사유',
  `status` ENUM('PENDING', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '상태',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '신고일',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_reports_reported_user` FOREIGN KEY (`reported_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_reports_reporter_user` FOREIGN KEY (`reporter_user_id`) REFERENCES `users` (`id`),
  UNIQUE (`reporter_user_id`, `target_type`, `target_id`)
);

-- FOLLOWS
CREATE TABLE `follows` (
  `follower_id` BIGINT NOT NULL COMMENT '팔로우 하는 사용자',
  `following_id` BIGINT NOT NULL COMMENT '팔로우 당하는 사용자',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '팔로우 시작일',
  `deleted_at` DATETIME NULL COMMENT '삭제 시각',
  PRIMARY KEY (`follower_id`, `following_id`),
  CONSTRAINT `FK_follows_follower` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_follows_following` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_follows_self` CHECK (`follower_id` <> `following_id`)
);

-- NOTIFICATIONS
CREATE TABLE `notifications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '알림 ID',
  `user_id` BIGINT NOT NULL COMMENT '알림을 받는 사용자 ID',
  `type` ENUM('FOLLOW', 'APPLICATION', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED') NOT NULL COMMENT '알림 유형',
  `message` VARCHAR(255) NOT NULL COMMENT '알림 메시지',
  `related_id` BIGINT NULL COMMENT '연관된 엔티티 ID (예: applications.id, follows.follower_id)',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '읽음 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '알림 생성 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);

-- MESSAGES
CREATE TABLE `messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '쪽지 ID',
  `sender_id` BIGINT NOT NULL COMMENT '보낸 사용자 ID',
  `receiver_id` BIGINT NOT NULL COMMENT '받는 사용자 ID',
  `content` TEXT NOT NULL COMMENT '쪽지 내용',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '읽음 여부',
  `deleted_by_sender` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '보낸 사람 삭제 여부',
  `deleted_by_receiver` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '받는 사람 삭제 여부',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '보낸 시각',
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_messages_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`)
);

-- ACTIVE USERS VIEW
CREATE VIEW `active_users` AS
SELECT * FROM `users`
WHERE `deleted_at` IS NULL AND `status` = 'ACTIVE';
