#schemas/meta.py
from pydantic import BaseModel

class SkillResponse(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class ApplicationFieldResponse(BaseModel):   # ✅ 이름 변경
    id: int
    name: str

    class Config:
        orm_mode = True