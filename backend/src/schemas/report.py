from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class ReportBase(BaseModel):
    user_id: int
    report_date: date
    content: str
    tasks_completed: Optional[str] = None
    tasks_planned: Optional[str] = None
    issues: Optional[str] = None

class ReportCreate(BaseModel):
    report_date: date = Field(default_factory=date.today)
    content: str
    tasks_completed: Optional[str] = None
    tasks_planned: Optional[str] = None
    issues: Optional[str] = None

class ReportUpdate(BaseModel):
    content: Optional[str] = None
    tasks_completed: Optional[str] = None
    tasks_planned: Optional[str] = None
    issues: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class ReportWithUser(ReportResponse):
    user_full_name: str 