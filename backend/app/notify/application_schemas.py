# schemas/application.py
from datetime import datetime
from enum import Enum
from typing import List, Optional

# v2 / v1 양쪽 지원용 Base
try:
    from pydantic import BaseModel, ConfigDict  # v2
    class ORMModel(BaseModel):
        model_config = ConfigDict(from_attributes=True)
except Exception:  # v1
    from pydantic import BaseModel
    class ORMModel(BaseModel):
        class Config:
            orm_mode = True

class ApplicationStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ApplicationAnswerIn(ORMModel):
    field_id: int
    answer_text: str

class ApplicationCreate(ORMModel):
    post_id: int
    answers: List[ApplicationAnswerIn]

class ApplicationAnswerOut(ORMModel):
    field_id: int
    name: Optional[str] = None
    answer_text: str

class ApplicationOut(ORMModel):
    id: int
    user_id: int
    post_id: int
    status: ApplicationStatus
    created_at: datetime
    answers: List[ApplicationAnswerOut] = []

class RequiredFieldOut(ORMModel):
    field_id: int
    name: str
