
from app.auth import auth_router
from app.test import db_test
from app.profile import profile_router, follow_router, skill_router

app = FastAPI()

# 테이블은 이미 MySQL에 있으므로 create_all() 생략

app.include_router(auth_router.router)   # 임시 로그인/회원가입 라우터
app.include_router(db_test.router)       # DB 연결 테스트 라우터
app.include_router(profile_router.router)
app.include_router(follow_router.router)
app.include_router(skill_router.router)  

