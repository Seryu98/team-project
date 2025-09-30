from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# 회원가입 시 클라이언트가 보내는 데이터 형식 정의
class UserRegister(BaseModel):
    email: EmailStr
    user_id: str
    password: str = Field(..., min_length=6)
    name: str
    nickname: str
    phone_number: Optional[str] = None

# 로그인 성공 시 서버가 반환하는 토큰 형식
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"