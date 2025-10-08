# app/profile/skill_schemas.py
from pydantic import BaseModel
from typing import Optional

# 신규 스킬 등록(초기 시드나 관리자용) - 지금 단계에선 프론트에서 직접 쓰지 않아도 됨
class SkillCreate(BaseModel):
    name: str


# 내 보유 스킬에 추가할 때 사용하는 DTO
class UserSkillCreate(BaseModel):
    skill_id: int
    level: int  # 1 ~ 3


# 응답용 DTO (목록/조회 공용)
class SkillOut(BaseModel):
    id: int
    name: str
    level: Optional[int] = None  # 보유 스킬 목록이면 level 포함, 검색 결과면 level=None
    icon: Optional[str] = None   # 프론트에서 별 필요 없으면 무시 가능 (assets 경로 관례)

    class Config:
        orm_mode = True
