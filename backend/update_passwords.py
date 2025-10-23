# update_passwords.py
import pymysql, bcrypt, os

DB_HOST = os.getenv("DB_HOST","192.168.55.92")
DB_PORT = int(os.getenv("DB_PORT",3306))
DB_USER = os.getenv("DB_USER","team_user")
DB_PASSWORD = os.getenv("DB_PASSWORD","1234")
DB_NAME = os.getenv("DB_NAME","team_project")

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER,
                       password=DB_PASSWORD, db=DB_NAME, charset="utf8mb4")
cur = conn.cursor()

plain = b"Test0001!"   # ✅ 정책 충족: 영문+숫자+특수문자
hash_value = bcrypt.hashpw(plain, bcrypt.gensalt()).decode()

cur.execute("""
    UPDATE users 
    SET password_hash=%s,
        auth_provider='LOCAL',
        social_id=NULL,
        status='ACTIVE',
        account_locked=FALSE,
        login_fail_count=0,
        banned_until=NULL
""", (hash_value,))
conn.commit()
print("✅ All users updated to password 'Test0001!' (hashed for bcrypt).")
cur.close(); conn.close()
