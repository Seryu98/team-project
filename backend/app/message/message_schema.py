from pydantic import BaseModel
from datetime import datetime

class MessageBase(BaseModel):
    sender_id: int
    receiver_id: int
    content: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: int
    is_read: bool
    created_at: datetime
    sender_name: str

    class Config:
        orm_mode = True
