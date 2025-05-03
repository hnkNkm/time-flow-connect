from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AttendanceBase(BaseModel):
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    break_start_time: Optional[datetime] = None
    break_end_time: Optional[datetime] = None
    memo: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    check_out_time: Optional[datetime] = None
    break_start_time: Optional[datetime] = None
    break_end_time: Optional[datetime] = None
    memo: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    id: int
    user_id: int
    total_working_hours: Optional[float] = None
    total_break_hours: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class AttendanceWithUser(AttendanceResponse):
    user_full_name: str

class MonthlyAttendanceStats(BaseModel):
    user_id: int
    user_full_name: str
    total_days_worked: int
    total_working_hours: float
    total_overtime_hours: float
    estimated_salary: float

class TimeAdjustmentRequest(BaseModel):
    attendance_id: Optional[int] = None
    user_id: int
    request_date: datetime
    original_check_in: Optional[datetime] = None
    original_check_out: Optional[datetime] = None
    requested_check_in: Optional[datetime] = None
    requested_check_out: Optional[datetime] = None
    original_break_start: Optional[datetime] = None
    original_break_end: Optional[datetime] = None
    requested_break_start: Optional[datetime] = None
    requested_break_end: Optional[datetime] = None
    reason: str
    status: str = "pending"  # pending, approved, rejected
    
    class Config:
        orm_mode = True

class TimeAdjustmentRequestCreate(BaseModel):
    attendance_id: Optional[int] = None
    request_date: datetime = Field(default_factory=datetime.now)
    requested_check_in: Optional[datetime] = None
    requested_check_out: Optional[datetime] = None
    requested_break_start: Optional[datetime] = None
    requested_break_end: Optional[datetime] = None
    reason: str
    
class TimeAdjustmentRequestUpdate(BaseModel):
    status: str
    admin_comment: Optional[str] = None
    
class TimeAdjustmentRequestResponse(TimeAdjustmentRequest):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    admin_comment: Optional[str] = None
    admin_id: Optional[int] = None 