from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, date, time
from enum import Enum
from .base import BaseResponse, AdminActionMixin, UserInfoMixin

class ShiftStatus(str, Enum):
    PENDING = "pending"     # 希望提出済み（確定前）
    CONFIRMED = "confirmed" # 確定済み
    REJECTED = "rejected"   # 拒否

class ShiftAvailability(str, Enum):
    AVAILABLE = "available"         # 勤務可能
    UNAVAILABLE = "unavailable"     # 勤務不可
    PREFER = "prefer"               # 希望する
    PREFER_NOT = "prefer_not"       # できれば避けたい
    ANY = "any"                     # どちらでも

class ShiftBase(BaseModel):
    user_id: int
    date: date
    availability: ShiftAvailability = ShiftAvailability.ANY
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    memo: Optional[str] = None

class ShiftCreate(BaseModel):
    date: date
    availability: ShiftAvailability = ShiftAvailability.AVAILABLE
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    memo: Optional[str] = None

class ShiftUpdate(BaseModel):
    availability: Optional[ShiftAvailability] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    memo: Optional[str] = None
    status: Optional[ShiftStatus] = None

class ShiftResponse(ShiftBase, BaseResponse, AdminActionMixin):
    status: ShiftStatus

class ShiftWithUser(ShiftResponse, UserInfoMixin):
    pass

class ShiftTemplate(BaseModel):
    name: str
    start_time: time
    end_time: time
    description: Optional[str] = None

class ShiftTemplateCreate(ShiftTemplate):
    pass

class ShiftTemplateResponse(ShiftTemplate, BaseResponse):
    pass

class MonthlyShiftRequest(BaseModel):
    year: int
    month: int
    shifts: List[ShiftCreate]

class ConfirmShiftData(BaseModel):
    shifts: List[int]  # シフトIDのリスト
    status: ShiftStatus
    admin_comment: Optional[str] = None

class ShiftSummaryResponse(BaseModel):
    date: date
    total_shifts: int
    confirmed_shifts: int
    users: List[Dict] 