from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class NotificationBase(BaseModel):
    type: str  # alert, warning, info 등
    title: str
    message: str
    target_id: Optional[int] = None
    measurement_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        orm_mode = True
        
class NotificationUpdate(BaseModel):
    is_read: bool