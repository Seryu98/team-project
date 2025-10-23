# app/core/config.py
import os

# ===============================================================
# ⚙️ JWT 토큰 만료 시간 설정
# ===============================================================

# 기본값: Access Token 2시간, Refresh Token 7일
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
