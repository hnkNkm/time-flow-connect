from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, date
from .base import BaseResponse

# 給与明細詳細
class PayslipDetailBase(BaseModel):
    category: str  # allowance, deduction
    item_name: str
    amount: int
    description: Optional[str] = None

class PayslipDetailCreate(PayslipDetailBase):
    pass

class PayslipDetailResponse(PayslipDetailBase, BaseResponse):
    id: int
    payslip_id: int

# 給与明細
class PayslipBase(BaseModel):
    year: int
    month: int
    
    # 勤怠情報
    work_days: int = 0
    total_hours: float = 0
    regular_hours: float = 0
    overtime_hours: float = 0
    late_night_hours: float = 0
    holiday_hours: float = 0
    
    # 支給項目
    base_salary: int = 0
    overtime_pay: int = 0
    late_night_pay: int = 0
    holiday_pay: int = 0
    other_allowances: int = 0
    gross_salary: int = 0
    
    # 控除項目
    health_insurance: int = 0
    pension: int = 0
    employment_insurance: int = 0
    income_tax: int = 0
    resident_tax: int = 0
    other_deductions: int = 0
    total_deductions: int = 0
    
    # 差引支給額
    net_salary: int = 0

class PayslipCreate(BaseModel):
    user_id: int
    year: int
    month: int
    
    @validator("month")
    def validate_month(cls, v):
        if v < 1 or v > 12:
            raise ValueError("月は1〜12の間で指定してください")
        return v

class PayslipUpdate(BaseModel):
    # 控除項目の更新用
    health_insurance: Optional[int] = None
    pension: Optional[int] = None
    employment_insurance: Optional[int] = None
    income_tax: Optional[int] = None
    resident_tax: Optional[int] = None
    other_deductions: Optional[int] = None
    other_allowances: Optional[int] = None

class PayslipResponse(PayslipBase, BaseResponse):
    id: int
    user_id: int
    status: str
    confirmed_at: Optional[datetime] = None
    confirmed_by: Optional[int] = None
    paid_at: Optional[datetime] = None
    details: List[PayslipDetailResponse] = []
    
    # ユーザー情報
    user_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    
    class Config:
        orm_mode = True

class PayslipListResponse(BaseModel):
    items: List[PayslipResponse]
    total: int

# 給与計算リクエスト
class PayslipCalculateRequest(BaseModel):
    year: int
    month: int
    user_ids: Optional[List[int]] = None  # Noneの場合は全員
    
    @validator("month")
    def validate_month(cls, v):
        if v < 1 or v > 12:
            raise ValueError("月は1〜12の間で指定してください")
        return v

# 給与計算結果
class PayslipCalculateResponse(BaseModel):
    created_count: int
    updated_count: int
    error_count: int
    errors: List[dict] = []

# 給与明細確定リクエスト
class PayslipConfirmRequest(BaseModel):
    payslip_ids: List[int]

# 給与支払い記録リクエスト
class PayslipPaymentRequest(BaseModel):
    payslip_ids: List[int]
    payment_date: date