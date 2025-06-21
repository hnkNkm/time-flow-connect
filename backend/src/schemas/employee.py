from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
from .base import BaseResponse

# 雇用形態のEnum
from enum import Enum

class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"

# 部署の基本スキーマ
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentResponse(DepartmentBase, BaseResponse):
    id: int
    is_active: bool

# 従業員の基本情報
class EmployeeBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "employee"
    is_active: bool = True
    
    # 社員情報
    employee_code: Optional[str] = None
    department_id: Optional[int] = None
    position: Optional[str] = None
    employment_type: Optional[EmploymentType] = EmploymentType.FULL_TIME
    hire_date: Optional[date] = None
    
    # 給与情報
    hourly_rate: Optional[int] = 1000
    monthly_salary: Optional[int] = None
    payment_method: Optional[PaymentMethod] = PaymentMethod.BANK_TRANSFER
    
    # 連絡先情報
    phone_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    address: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    password: str

class EmployeeUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    
    # 社員情報
    employee_code: Optional[str] = None
    department_id: Optional[int] = None
    position: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    hire_date: Optional[date] = None
    
    # 給与情報
    hourly_rate: Optional[int] = None
    monthly_salary: Optional[int] = None
    payment_method: Optional[PaymentMethod] = None
    
    # 連絡先情報
    phone_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    address: Optional[str] = None

class EmployeeResponse(EmployeeBase, BaseResponse):
    id: int
    department: Optional[DepartmentResponse] = None
    force_password_change: bool
    
    class Config:
        orm_mode = True

class EmployeeListResponse(BaseModel):
    items: List[EmployeeResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# パスワード変更
class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @validator("new_password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上である必要があります")
        return v

# 管理者による従業員パスワードリセット
class AdminPasswordReset(BaseModel):
    user_id: int
    new_password: str
    
    @validator("new_password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上である必要があります")
        return v