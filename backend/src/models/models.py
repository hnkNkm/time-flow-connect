from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, Time, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date, time
from typing import Optional
from .base import Base
from sqlalchemy.ext.declarative import declarative_base
import enum
from sqlalchemy.sql import func, expression

Base = declarative_base()

# ShiftStatusとShiftAvailabilityのenum型
class ShiftStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"

class ShiftAvailability(enum.Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PREFER = "prefer"
    PREFER_NOT = "prefer_not"
    ANY = "any"

# LeaveTypeとLeaveStatusのenum型
class LeaveType(enum.Enum):
    PAID = "paid"
    UNPAID = "unpaid"
    SICK = "sick"
    SPECIAL = "special"

class LeaveStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELED = "canceled"

# TimeAdjustmentRequestを先に定義
class TimeAdjustmentRequest(Base):
    __tablename__ = "time_adjustment_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    attendance_id = Column(Integer, ForeignKey("attendances.id"), nullable=True)
    
    request_date = Column(DateTime, nullable=False)
    original_check_in = Column(DateTime, nullable=True)
    original_check_out = Column(DateTime, nullable=True)
    requested_check_in = Column(DateTime, nullable=True)
    requested_check_out = Column(DateTime, nullable=True)
    original_break_start = Column(DateTime, nullable=True)
    original_break_end = Column(DateTime, nullable=True)
    requested_break_start = Column(DateTime, nullable=True)
    requested_break_end = Column(DateTime, nullable=True)
    
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    admin_comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.now, nullable=True)

# 休暇申請モデル - Userの前に移動
class Leave(Base):
    __tablename__ = "leaves"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_count = Column(Float, nullable=False)  # 休暇日数（0.5日単位も可）
    
    leave_type = Column(String(20), nullable=False, default="paid")
    reason = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    admin_comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # リレーションシップは後で設定

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="employee")  # e.g., employee, admin
    is_active = Column(Boolean, default=True)
    # 初回パスワード変更フラグを追加
    force_password_change = Column(Boolean, default=True, server_default=expression.false(), nullable=False)
    
    # 社員情報
    employee_code = Column(String(50), unique=True, nullable=True)  # 社員番号（会社独自の番号）
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    position = Column(String(100), nullable=True)  # 役職
    employment_type = Column(String(50), default="full_time")  # full_time, part_time, contract, intern
    hire_date = Column(Date, nullable=True)  # 入社日
    
    # 給与情報
    hourly_rate = Column(Integer, default=1000)  # 時給（円）
    monthly_salary = Column(Integer, nullable=True)  # 月給（円）
    payment_method = Column(String(50), default="bank_transfer")  # bank_transfer, cash
    
    # 連絡先情報
    phone_number = Column(String(20), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    emergency_phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーションシップ
    attendances = relationship("Attendance", back_populates="user")
    shifts = relationship("Shift", back_populates="user", foreign_keys="Shift.user_id")
    adjustment_requests = relationship("TimeAdjustmentRequest", foreign_keys=[TimeAdjustmentRequest.user_id], back_populates="user")
    department = relationship("Department", back_populates="users")
    user_departments = relationship("UserDepartment", back_populates="user")
    leaves = relationship("Leave", foreign_keys=[Leave.user_id], back_populates="user")
    leave_allocations = relationship("LeaveAllocation", back_populates="user")
    reports = relationship("Report", back_populates="user")
    payslips = relationship("Payslip", foreign_keys="Payslip.user_id", back_populates="user")


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    check_in_time = Column(DateTime)
    check_out_time = Column(DateTime, nullable=True)
    break_start_time = Column(DateTime, nullable=True)
    break_end_time = Column(DateTime, nullable=True)
    total_working_hours = Column(Float, nullable=True)  # 合計勤務時間（時間単位）
    total_break_hours = Column(Float, nullable=True)  # 合計休憩時間（時間単位）
    memo = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # リレーションシップ
    user = relationship("User", back_populates="attendances")
    adjustment_requests = relationship("TimeAdjustmentRequest", back_populates="attendance")


class Shift(Base):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    date = Column(Date, nullable=False)
    availability = Column(String(20), default="any")
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    memo = Column(String(255), nullable=True)
    
    status = Column(String(20), default="pending")
    admin_comment = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # リレーションシップ
    user = relationship("User", back_populates="shifts", foreign_keys=[user_id])
    admin = relationship("User", foreign_keys=[admin_id])


class PayrollSetting(Base):
    __tablename__ = "payroll_settings"

    id = Column(Integer, primary_key=True, index=True)
    overtime_rate = Column(Float, default=1.25)  # 残業手当倍率（通常時給 × 倍率）
    night_shift_rate = Column(Float, default=1.25)  # 夜勤手当倍率
    holiday_rate = Column(Float, default=1.35)  # 休日手当倍率
    night_shift_start_time = Column(Time, default=time(22, 0))  # 夜勤開始時間（例：22:00）
    night_shift_end_time = Column(Time, default=time(5, 0))  # 夜勤終了時間（例：5:00）
    regular_hours_per_day = Column(Float, default=8.0)  # 1日の所定労働時間
    use_db_rates = Column(Boolean, default=False)  # DB料率を使用するか
    default_prefecture = Column(String(50), nullable=True)  # デフォルト都道府県
    default_industry = Column(String(50), nullable=True)  # デフォルト業種
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


# 給与明細モデル
class Payslip(Base):
    __tablename__ = "payslips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # 勤怠情報
    work_days = Column(Integer, default=0)  # 出勤日数
    total_hours = Column(Float, default=0)  # 総労働時間
    regular_hours = Column(Float, default=0)  # 通常勤務時間
    overtime_hours = Column(Float, default=0)  # 残業時間
    late_night_hours = Column(Float, default=0)  # 深夜勤務時間
    holiday_hours = Column(Float, default=0)  # 休日勤務時間
    
    # 支給項目
    base_salary = Column(Integer, default=0)  # 基本給
    overtime_pay = Column(Integer, default=0)  # 残業手当
    late_night_pay = Column(Integer, default=0)  # 深夜手当
    holiday_pay = Column(Integer, default=0)  # 休日手当
    other_allowances = Column(Integer, default=0)  # その他手当
    gross_salary = Column(Integer, default=0)  # 総支給額
    
    # 控除項目
    health_insurance = Column(Integer, default=0)  # 健康保険料
    pension = Column(Integer, default=0)  # 厚生年金
    employment_insurance = Column(Integer, default=0)  # 雇用保険
    income_tax = Column(Integer, default=0)  # 所得税
    resident_tax = Column(Integer, default=0)  # 住民税
    other_deductions = Column(Integer, default=0)  # その他控除
    total_deductions = Column(Integer, default=0)  # 控除合計
    
    # 差引支給額
    net_salary = Column(Integer, default=0)  # 手取り額
    
    # ステータス
    status = Column(String(20), default="draft")  # draft, confirmed, paid
    confirmed_at = Column(DateTime, nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # リレーションシップ
    user = relationship("User", foreign_keys=[user_id], back_populates="payslips")
    confirmed_by_user = relationship("User", foreign_keys=[confirmed_by])
    details = relationship("PayslipDetail", back_populates="payslip", cascade="all, delete-orphan")


# 給与明細詳細モデル（拡張用）
class PayslipDetail(Base):
    __tablename__ = "payslip_details"
    
    id = Column(Integer, primary_key=True, index=True)
    payslip_id = Column(Integer, ForeignKey("payslips.id"), nullable=False)
    
    category = Column(String(50), nullable=False)  # allowance, deduction
    item_name = Column(String(100), nullable=False)  # 項目名
    amount = Column(Integer, nullable=False)  # 金額
    description = Column(String(255), nullable=True)  # 説明
    
    created_at = Column(DateTime, default=datetime.now)
    
    # リレーションシップ
    payslip = relationship("Payslip", back_populates="details")


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    name = Column(String)
    is_paid = Column(Boolean, default=True)  # 有給休暇かどうか
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    description = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


# 部署モデル
class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # リレーションシップ
    users = relationship("User", foreign_keys="User.department_id", back_populates="department")
    user_departments = relationship("UserDepartment", back_populates="department")


# ユーザーと部署の関連モデル（多対多）
class UserDepartment(Base):
    __tablename__ = "user_departments"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), primary_key=True)
    
    created_at = Column(DateTime, default=datetime.now)
    
    # リレーションシップ
    user = relationship("User", back_populates="user_departments")
    department = relationship("Department", back_populates="user_departments")


# 有給休暇付与記録モデル
class LeaveAllocation(Base):
    __tablename__ = "leave_allocations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    allocated_days = Column(Float, nullable=False)  # 付与日数
    effective_date = Column(Date, nullable=False)   # 付与日
    expiry_date = Column(Date, nullable=True)      # 有効期限
    reason = Column(Text, nullable=True)           # 付与理由
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # リレーションシップ
    user = relationship("User", back_populates="leave_allocations")

# 日報・作業記録モデル
class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    report_date = Column(Date, nullable=False)
    content = Column(Text, nullable=False)
    tasks_completed = Column(Text, nullable=True)
    tasks_planned = Column(Text, nullable=True)
    issues = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # リレーションシップ
    user = relationship("User", back_populates="reports")

# 保険料率マスタモデル
class InsuranceRate(Base):
    __tablename__ = "insurance_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    rate_type = Column(String(50), nullable=False)  # health, pension, employment
    rate_name = Column(String(100), nullable=False)  # 表示名（例：健康保険料）
    prefecture = Column(String(50), nullable=True)  # 都道府県（健康保険用）
    industry_type = Column(String(50), nullable=True)  # 業種（雇用保険用）
    rate = Column(Float, nullable=False)  # 料率（例: 0.05 = 5%）
    employee_rate = Column(Float, nullable=True)  # 従業員負担率
    employer_rate = Column(Float, nullable=True)  # 会社負担率
    effective_date = Column(Date, nullable=False)  # 適用開始日
    expiry_date = Column(Date, nullable=True)  # 適用終了日
    notes = Column(Text, nullable=True)  # 備考
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


# 所得税率テーブル
class IncomeTaxRate(Base):
    __tablename__ = "income_tax_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    min_amount = Column(Integer, nullable=False)  # 下限金額
    max_amount = Column(Integer, nullable=True)  # 上限金額（NULL=上限なし）
    rate = Column(Float, nullable=False)  # 税率
    deduction = Column(Integer, default=0)  # 控除額
    withholding_type = Column(String(20), default="monthly")  # monthly, daily
    dependent_count = Column(Integer, default=0)  # 扶養人数
    effective_date = Column(Date, nullable=False)  # 適用開始日
    expiry_date = Column(Date, nullable=True)  # 適用終了日
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


# リレーションシップを後で設定
Leave.user = relationship("User", foreign_keys=[Leave.user_id], back_populates="leaves")
Leave.admin = relationship("User", foreign_keys=[Leave.admin_id])
TimeAdjustmentRequest.user = relationship("User", foreign_keys=[TimeAdjustmentRequest.user_id], back_populates="adjustment_requests")
TimeAdjustmentRequest.attendance = relationship("Attendance", back_populates="adjustment_requests") 