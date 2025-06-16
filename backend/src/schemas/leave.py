from pydantic import Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, date
from .base import BaseSchema, TimestampSchema, IdSchema
from .common import LeaveType, LeaveStatus


class LeaveBase(BaseSchema):
    start_date: date
    end_date: date
    leave_type: LeaveType = Field(default=LeaveType.PAID)
    reason: Optional[str] = Field(None, max_length=1000, description="休暇理由")
    
    @model_validator(mode='after')
    def validate_dates(self):
        """日付の妥当性を検証"""
        if self.end_date < self.start_date:
            raise ValueError('終了日は開始日以降でなければなりません')
        return self
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v, info):
        """特定の休暇タイプでは理由が必須"""
        if 'leave_type' in info.data:
            leave_type = info.data['leave_type']
            if leave_type in [LeaveType.SICK, LeaveType.SPECIAL] and not v:
                raise ValueError(f'{leave_type}休暇の場合、理由は必須です')
        return v


class LeaveCreate(LeaveBase):
    """休暇申請作成"""
    pass


class LeaveUpdate(BaseSchema):
    """休暇申請更新"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    leave_type: Optional[LeaveType] = None
    reason: Optional[str] = Field(None, max_length=1000)
    status: Optional[LeaveStatus] = None
    admin_comment: Optional[str] = Field(None, max_length=1000)


class LeaveResponse(LeaveBase, IdSchema, TimestampSchema):
    """休暇申請レスポンス"""
    user_id: int
    status: LeaveStatus = Field(default=LeaveStatus.PENDING)
    days_count: float = Field(..., ge=0.5, description="休暇日数")
    admin_id: Optional[int] = None
    admin_comment: Optional[str] = Field(None, max_length=1000)


class LeaveWithUser(LeaveResponse):
    """ユーザー情報付き休暇申請"""
    user_full_name: str = Field(..., min_length=1, max_length=100)
    admin_full_name: Optional[str] = Field(None, min_length=1, max_length=100)


class LeaveBalance(BaseSchema):
    """有給休暇残高"""
    user_id: int
    user_full_name: str = Field(..., min_length=1, max_length=100)
    total_paid_leave: float = Field(..., ge=0, description="付与されている有給日数")
    used_paid_leave: float = Field(..., ge=0, description="使用済み有給日数")
    remaining_paid_leave: float = Field(..., ge=0, description="残りの有給日数")
    upcoming_paid_leave: float = Field(..., ge=0, description="承認待ちの有給日数")
    
    @model_validator(mode='after')
    def validate_balance(self):
        """残高の整合性を検証"""
        calculated_remaining = self.total_paid_leave - self.used_paid_leave
        if abs(self.remaining_paid_leave - calculated_remaining) > 0.01:
            raise ValueError('有給残高の計算が合いません')
        return self


class LeaveBalanceUpdate(BaseSchema):
    """有給休暇付与"""
    user_id: int
    paid_leave_days: float = Field(..., gt=0, le=40, description="付与日数")
    effective_date: date = Field(default_factory=date.today)
    reason: Optional[str] = Field(None, max_length=500, description="付与理由")


class LeaveAllocationResponse(BaseSchema, IdSchema, TimestampSchema):
    """有給休暇付与記録"""
    user_id: int
    user_full_name: str = Field(..., min_length=1, max_length=100)
    allocated_days: float = Field(..., gt=0, description="付与日数")
    effective_date: date
    expiry_date: Optional[date] = None
    reason: Optional[str] = Field(None, max_length=500)
    
    @model_validator(mode='after')
    def validate_expiry_date(self):
        """有効期限の妥当性を検証"""
        if self.expiry_date and self.expiry_date <= self.effective_date:
            raise ValueError('有効期限は付与日より後でなければなりません')
        return self