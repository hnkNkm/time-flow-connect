from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .base import BaseResponse, AdminActionMixin, UserInfoMixin, OrmConfigMixin

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

class AttendanceResponse(AttendanceBase, BaseResponse):
    user_id: int
    total_working_hours: Optional[float] = None
    total_break_hours: Optional[float] = None
    updated_at: datetime

class AttendanceWithUser(AttendanceResponse, UserInfoMixin):
    pass

class MonthlyAttendanceStats(BaseModel):
    user_id: int
    user_full_name: str
    total_days_worked: int
    total_working_hours: float
    total_overtime_hours: float
    estimated_salary: float

class TimeFields(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None

class TimeAdjustmentRequest(OrmConfigMixin):
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
    
class TimeAdjustmentRequestResponse(TimeAdjustmentRequest, BaseResponse, AdminActionMixin):
    pass 