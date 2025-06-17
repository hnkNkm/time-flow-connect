from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
from .base import BaseResponse, AdminActionMixin, UserInfoMixin, OrmConfigMixin

class LeaveType(str, Enum):
    PAID = "paid"           # 有給休暇
    UNPAID = "unpaid"       # 無給休暇
    SICK = "sick"           # 病気休暇
    SPECIAL = "special"     # 特別休暇

class LeaveStatus(str, Enum):
    PENDING = "pending"     # 申請中
    APPROVED = "approved"   # 承認済み
    REJECTED = "rejected"   # 却下
    CANCELED = "canceled"   # キャンセル

class LeaveBase(BaseModel):
    user_id: int
    start_date: date
    end_date: date
    leave_type: LeaveType = LeaveType.PAID
    reason: Optional[str] = None
    status: LeaveStatus = LeaveStatus.PENDING
    
class LeaveCreate(BaseModel):
    start_date: date
    end_date: date
    leave_type: LeaveType = LeaveType.PAID
    reason: Optional[str] = None
    
class LeaveUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    leave_type: Optional[LeaveType] = None
    reason: Optional[str] = None
    status: Optional[LeaveStatus] = None
    admin_comment: Optional[str] = None

class LeaveResponse(LeaveBase, BaseResponse, AdminActionMixin):
    days_count: float

class LeaveWithUser(LeaveResponse, UserInfoMixin):
    admin_full_name: Optional[str] = None

class LeaveBalance(UserInfoMixin, OrmConfigMixin):
    total_paid_leave: float       # 付与されている有給日数
    used_paid_leave: float        # 使用済み有給日数
    remaining_paid_leave: float   # 残りの有給日数
    upcoming_paid_leave: float    # 承認待ちの有給日数

class LeaveBalanceUpdate(BaseModel):
    user_id: int
    paid_leave_days: float
    effective_date: date = Field(default_factory=date.today)
    reason: Optional[str] = None
    
class LeaveAllocation(BaseResponse, UserInfoMixin):
    allocated_days: float
    effective_date: date
    expiry_date: Optional[date] = None
    reason: Optional[str] = None 