#app/meta/meta_schema.py
from pydantic import BaseModel

class SkillResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ApplicationFieldResponse(BaseModel):   # ✅ 이름 변경
    id: int
    name: str

    class Config:
        from_attributes = True