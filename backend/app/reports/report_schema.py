# ✅ report_schema.py (교체)
from pydantic import BaseModel, constr
from datetime import datetime
from .report_model import TargetType, ReportStatus

class ReportCreate(BaseModel):
    reported_user_id: int | None = None  # ✅ USER 이외 타입에서는 없어도 됨
    target_type: TargetType
    target_id: int
    reason: constr(strip_whitespace=True, min_length=1, max_length=255)

class ReportResponse(BaseModel):
    id: int
    reported_user_id: int
    reporter_user_id: int
    target_type: TargetType
    target_id: int
    reason: str
    status: ReportStatus
    created_at: datetime  # ✅ datetime

    class Config:
        orm_mode = True
