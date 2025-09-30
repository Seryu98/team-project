# app/reports/report_schema.py
from pydantic import BaseModel
from datetime import datetime
from .report_model import TargetType, ReportStatus

class ReportCreate(BaseModel):
    reported_user_id: int
    target_type: TargetType
    target_id: int
    reason: str

class ReportResponse(BaseModel):
    id: int
    reported_user_id: int
    reporter_user_id: int
    target_type: TargetType
    target_id: int
    reason: str
    status: ReportStatus
    created_at: datetime

    class Config:
        orm_mode = True
