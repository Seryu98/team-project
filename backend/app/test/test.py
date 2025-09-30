#bcrypt 해시가 잘 생성되는지 테스트” 하기 위해 만든 임시 스크립트
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("test1234"))
