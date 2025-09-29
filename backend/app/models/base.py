# app/models/base.py
from sqlalchemy.orm import declarative_base

# 모든 모델이 상속받을 Base
Base = declarative_base()
