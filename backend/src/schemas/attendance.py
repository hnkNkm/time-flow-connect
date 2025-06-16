from pydantic import Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from .base import BaseSchema, TimestampSchema, IdSchema
from .common import AdjustmentStatus


class AttendanceBase(BaseSchema):
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    break_start_time: Optional[datetime] = None
    break_end_time: Optional[datetime] = None
    memo: Optional[str] = Field(None, max_length=500, description="メモ")
    
    @field_validator('check_out_time')
    @classmethod
    def validate_check_out_time(cls, v, info):
        """退勤時間は出勤時間より後でなければならない"""
        if v and 'check_in_time' in info.data and info.data['check_in_time']:
            if v <= info.data['check_in_time']:
                raise ValueError('退勤時間は出勤時間より後でなければなりません')
        return v
    
    @model_validator(mode='after')
    def validate_break_times(self):
        """休憩時間の妥当性を検証"""
        if self.break_start_time and self.break_end_time:
            if self.break_end_time <= self.break_start_time:
                raise ValueError('休憩終了時間は休憩開始時間より後でなければなりません')
            if self.check_in_time and self.break_start_time < self.check_in_time:
                raise ValueError('休憩開始時間は出勤時間より後でなければなりません')
            if self.check_out_time and self.break_end_time > self.check_out_time:
                raise ValueError('休憩終了時間は退勤時間より前でなければなりません')
        return self


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseSchema):
    check_out_time: Optional[datetime] = None
    break_start_time: Optional[datetime] = None
    break_end_time: Optional[datetime] = None
    memo: Optional[str] = Field(None, max_length=500)


class AttendanceResponse(AttendanceBase, IdSchema, TimestampSchema):
    user_id: int
    total_working_hours: Optional[float] = Field(None, ge=0, le=24, description="合計勤務時間")
    total_break_hours: Optional[float] = Field(None, ge=0, le=24, description="合計休憩時間")


class AttendanceWithUser(AttendanceResponse):
    user_full_name: str = Field(..., min_length=1, max_length=100)


class MonthlyAttendanceStats(BaseSchema):
    user_id: int
    user_full_name: str = Field(..., min_length=1, max_length=100)
    total_days_worked: int = Field(..., ge=0, le=31)
    total_working_hours: float = Field(..., ge=0)
    total_overtime_hours: float = Field(..., ge=0)
    estimated_salary: float = Field(..., ge=0, description="推定給与")


class TimeAdjustmentRequest(BaseSchema):
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
    reason: str = Field(..., min_length=1, max_length=1000, description="修正理由")
    status: AdjustmentStatus = Field(default=AdjustmentStatus.PENDING)


class TimeAdjustmentRequestCreate(BaseSchema):
    attendance_id: Optional[int] = None
    request_date: datetime = Field(default_factory=datetime.now)
    requested_check_in: Optional[datetime] = None
    requested_check_out: Optional[datetime] = None
    requested_break_start: Optional[datetime] = None
    requested_break_end: Optional[datetime] = None
    reason: str = Field(..., min_length=1, max_length=1000, description="修正理由")


class TimeAdjustmentRequestUpdate(BaseSchema):
    status: AdjustmentStatus
    admin_comment: Optional[str] = Field(None, max_length=1000)


class TimeAdjustmentRequestResponse(TimeAdjustmentRequest, IdSchema, TimestampSchema):
    admin_comment: Optional[str] = Field(None, max_length=1000)
    admin_id: Optional[int] = None