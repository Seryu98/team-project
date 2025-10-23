"""
seed_dummy_data_final.py
----------------------------------------
✅ Sol-Matching 통합 더미데이터 시더 (2025-10-08 확정 스키마 기반)
- .env 자동 로드
- faker / tqdm 기반
- FK 무결성 100% 유지
- realistic Korean data
- ⚙️ 평문 비밀번호("0001") 저장 → FastAPI 로그인 가능
----------------------------------------
"""

import os
import random
import datetime
from tqdm import tqdm
from faker import Faker
from dotenv import load_dotenv
import pymysql

# ======================================================
# 0️⃣ .env 자동 로드
# ======================================================
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "team_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1234")
DB_NAME = os.getenv("DB_NAME", "team_project")

# ======================================================
# 1️⃣ Faker 초기화
# ======================================================
fake = Faker("ko_KR")
Faker.seed(42)
random.seed(42)

# ======================================================
# 2️⃣ MySQL 연결
# ======================================================
conn = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    charset="utf8mb4",
    autocommit=False,
)
cur = conn.cursor()
print(f"🔌 Connected to {DB_HOST}/{DB_NAME}")

# ======================================================
# 3️⃣ Helper 함수
# ======================================================
def q(query, rows=None, many=False):
    """안전한 쿼리 실행"""
    if many and rows:
        cur.executemany(query, rows)
    elif rows:
        cur.execute(query, rows)
    else:
        cur.execute(query)

def rand_enum(options):
    return random.choice(options)

def rand_date():
    return fake.date_between(start_date="-1y", end_date="today")

# ======================================================
# 4️⃣ USERS (평문 비밀번호 0001)
# ======================================================
print("🚀 Inserting users...")
users = []
for i in range(1000):
    nickname = f"user{i+1:04d}"
    email = f"{nickname}@example.com"
    user_id = f"uid_{i+1:04d}"
    password_hash = "0001"  # ✅ 평문 저장 (테스트용)
    auth_provider = "LOCAL"  # ✅ 로그인 테스트를 위해 LOCAL 고정
    social_id = None
    name = fake.name()
    phone = fake.phone_number()
    role = rand_enum(["MEMBER", "LEADER"])
    status = rand_enum(["ACTIVE", "ACTIVE", "BANNED"])  # ACTIVE 비율 높임
    created_at = fake.date_time_between(start_date="-1y", end_date="now")
    last_login_at = fake.date_time_between(start_date=created_at, end_date="now")
    login_fail_count = 0
    account_locked = False
    banned_until = None
    is_tutorial_completed = random.choice([True, False])

    users.append(
        (
            nickname,
            created_at,
            email,
            user_id,
            password_hash,
            auth_provider,
            social_id,
            name,
            phone,
            role,
            status,
            last_login_at,
            None,  # deleted_at
            None,  # reset_token
            None,  # reset_token_expire
            login_fail_count,
            None,  # last_fail_time
            account_locked,
            banned_until,
            is_tutorial_completed,
        )
    )

q(
    """
INSERT INTO users
(nickname, created_at, email, user_id, password_hash, auth_provider, social_id, name,
 phone_number, role, status, last_login_at, deleted_at, reset_token, reset_token_expire,
 login_fail_count, last_fail_time, account_locked, banned_until, is_tutorial_completed)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""",
    users,
    many=True,
)
conn.commit()
print("✅ users inserted (password = '0001').")

# ======================================================
# 5️⃣ PROFILES
# ======================================================
print("🚀 Inserting profiles...")
profiles = []
for uid in range(1, 1001):
    profiles.append(
        (
            uid,
            "/assets/profile/default_profile.png",
            fake.catch_phrase(),
            fake.paragraph(nb_sentences=2),
            fake.text(max_nb_chars=100),
            fake.word(),
            None,
            fake.date_of_birth(minimum_age=18, maximum_age=40),
            rand_enum(["MALE", "FEMALE"]),
            random.randint(0, 500),
            random.randint(0, 500),
            None,
        )
    )
q(
    """INSERT INTO profiles
(id, profile_image, headline, bio, experience, certifications, visibility,
 birth_date, gender, following_count, follower_count, deleted_at)
 VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""",
    profiles,
    many=True,
)
conn.commit()
print("✅ profiles inserted.")

# ======================================================
# 6️⃣ POSTS
# ======================================================
print("🚀 Inserting posts...")
posts = []
for pid in range(300):
    leader_id = random.randint(1, 1000)
    post_type = rand_enum(["PROJECT", "STUDY"])
    title = fake.catch_phrase()
    field = rand_enum(["AI", "Web", "App", "Game", "Data", "Backend", "Frontend"])
    capacity = random.randint(2, 6)
    description = fake.text(max_nb_chars=300)
    start_date = rand_date()
    end_date = rand_date()
    posts.append(
        (
            leader_id,
            post_type,
            title,
            field,
            None,
            capacity,
            random.randint(0, capacity),
            description,
            start_date,
            end_date,
            rand_enum(["PENDING", "APPROVED", "REJECTED"]),
            rand_enum(["OPEN", "CLOSED"]),
            rand_enum(["ONGOING", "ENDED"]),
            start_date,
            end_date,
            fake.date_time_this_year(),
            None,
        )
    )
q(
    """INSERT INTO posts
(leader_id, type, title, field, image_url, capacity, current_members, description,
 start_date, end_date, status, recruit_status, project_status, project_start, project_end,
 created_at, deleted_at)
 VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""",
    posts,
    many=True,
)
conn.commit()
print("✅ posts inserted.")

# ======================================================
# 7️⃣ BOARD_POSTS
# ======================================================
print("🚀 Inserting board_posts...")
board_posts = []
for i in range(300):
    board_posts.append(
        (
            random.randint(1, 5),
            random.randint(1, 1000),
            fake.sentence(nb_words=6),
            fake.paragraph(nb_sentences=3),
            None,
            random.randint(0, 1000),
            random.randint(0, 100),
            fake.date_time_this_year(),
            None,
            "VISIBLE",
            None,
        )
    )
q(
    """INSERT INTO board_posts
(category_id, author_id, title, content, attachment_url,
 view_count, like_count, created_at, updated_at, status, deleted_at)
 VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""",
    board_posts,
    many=True,
)
conn.commit()
print("✅ board_posts inserted.")

# ======================================================
# 8️⃣ COMMENTS
# ======================================================
print("🚀 Inserting comments...")
comments = []
for _ in range(2000):
    if random.random() < 0.5:
        comments.append(
            (
                random.randint(1, 300),
                None,
                random.randint(1, 1000),
                None,
                fake.sentence(),
                fake.date_time_this_year(),
                None,
                "VISIBLE",
                None,
            )
        )
    else:
        comments.append(
            (
                None,
                random.randint(1, 300),
                random.randint(1, 1000),
                None,
                fake.sentence(),
                fake.date_time_this_year(),
                None,
                "VISIBLE",
                None,
            )
        )
q(
    """INSERT INTO comments
(post_id, board_post_id, user_id, parent_id, content,
 created_at, updated_at, status, deleted_at)
 VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
""",
    comments,
    many=True,
)
conn.commit()
print("✅ comments inserted.")

# ======================================================
# 9️⃣ APPLICATIONS
# ======================================================
print("🚀 Inserting applications...")
apps = []
for _ in range(1000):
    apps.append(
        (
            random.randint(1, 300),
            random.randint(1, 1000),
            rand_enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "KICKED"]),
            fake.date_time_this_year(),
            None,
        )
    )
q(
    """INSERT INTO applications (post_id, user_id, status, created_at, deleted_at)
     VALUES (%s,%s,%s,%s,%s)
""",
    apps,
    many=True,
)
conn.commit()
print("✅ applications inserted.")

# ======================================================
# 🔟 마무리
# ======================================================
conn.commit()
cur.close()
conn.close()
print("\n🎉 Dummy data seeding completed successfully!")
