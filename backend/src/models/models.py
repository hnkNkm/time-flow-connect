from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, Time, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date, time
from typing import Optional
from .base import Base, TimestampMixin
from .enums import ShiftStatus, ShiftAvailability, LeaveType, LeaveStatus, AdjustmentStatus, UserRole
from sqlalchemy.sql import func, expression


# TimeAdjustmentRequestを先に定義
class TimeAdjustmentRequest(Base, TimestampMixin):
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
    status = Column(SQLEnum(AdjustmentStatus), default=AdjustmentStatus.PENDING, nullable=False)
    admin_comment = Column(Text, nullable=True)


# 休暇申請モデル - Userの前に移動
class Leave(Base, TimestampMixin):
    __tablename__ = "leaves"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    days_count = Column(Float, nullable=False)  # 休暇日数（0.5日単位も可）
    
    leave_type = Column(SQLEnum(LeaveType), nullable=False, default=LeaveType.PAID)
    reason = Column(Text, nullable=True)
    status = Column(SQLEnum(LeaveStatus), nullable=False, default=LeaveStatus.PENDING)
    admin_comment = Column(Text, nullable=True)
    
    # リレーションシップは後で設定


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active = Column(Boolean, default=True)
    # 初回パスワード変更フラグを追加
    force_password_change = Column(Boolean, default=True, server_default=expression.false(), nullable=False)
    hourly_rate = Column(Float, default=0.0, nullable=False)  # 時給

    # リレーションシップ
    attendances = relationship("Attendance", back_populates="user")
    shifts = relationship("Shift", back_populates="user", foreign_keys="Shift.user_id")
    adjustment_requests = relationship("TimeAdjustmentRequest", foreign_keys=[TimeAdjustmentRequest.user_id], back_populates="user")
    departments = relationship("UserDepartment", back_populates="user")
    leaves = relationship("Leave", foreign_keys=[Leave.user_id], back_populates="user")
    leave_allocations = relationship("LeaveAllocation", back_populates="user")
    reports = relationship("Report", back_populates="user")


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    check_in_time = Column(DateTime)
    check_out_time = Column(DateTime, nullable=True)
    break_start_time = Column(DateTime, nullable=True)
    break_end_time = Column(DateTime, nullable=True)
    total_working_hours = Column(Float, nullable=True)  # 合計勤務時間（時間単位）
    total_break_hours = Column(Float, nullable=True)  # 合計休憩時間（時間単位）
    memo = Column(String(500), nullable=True)

    # リレーションシップ
    user = relationship("User", back_populates="attendances")
    adjustment_requests = relationship("TimeAdjustmentRequest", back_populates="attendance")


class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    date = Column(Date, nullable=False)
    availability = Column(SQLEnum(ShiftAvailability), default=ShiftAvailability.ANY, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    memo = Column(String(255), nullable=True)
    
    status = Column(SQLEnum(ShiftStatus), default=ShiftStatus.PENDING, nullable=False)
    admin_comment = Column(String(255), nullable=True)
    
    # リレーションシップ
    user = relationship("User", back_populates="shifts", foreign_keys=[user_id])
    admin = relationship("User", foreign_keys=[admin_id])


class PayrollSetting(Base, TimestampMixin):
    __tablename__ = "payroll_settings"

    id = Column(Integer, primary_key=True, index=True)
    overtime_rate = Column(Float, default=1.25)  # 残業手当倍率（通常時給 × 倍率）
    night_shift_rate = Column(Float, default=1.25)  # 夜勤手当倍率
    holiday_rate = Column(Float, default=1.35)  # 休日手当倍率
    night_shift_start_time = Column(Time, default=time(22, 0))  # 夜勤開始時間（例：22:00）
    night_shift_end_time = Column(Time, default=time(5, 0))  # 夜勤終了時間（例：5:00）
    regular_hours_per_day = Column(Float, default=8.0)  # 1日の所定労働時間


class Holiday(Base, TimestampMixin):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    name = Column(String)
    is_paid = Column(Boolean, default=True)  # 有給休暇かどうか


class ShiftTemplate(Base, TimestampMixin):
    __tablename__ = "shift_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    description = Column(String(255), nullable=True)


# 部署モデル
class Department(Base, TimestampMixin):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # リレーションシップ
    users = relationship("UserDepartment", back_populates="department")


# ユーザーと部署の関連モデル（多対多）
class UserDepartment(Base):
    __tablename__ = "user_departments"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), primary_key=True)
    
    created_at = Column(DateTime, default=datetime.now)
    
    # リレーションシップ
    user = relationship("User", back_populates="departments")
    department = relationship("Department", back_populates="users")


# 有給休暇付与記録モデル
class LeaveAllocation(Base, TimestampMixin):
    __tablename__ = "leave_allocations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    allocated_days = Column(Float, nullable=False)  # 付与日数
    effective_date = Column(Date, nullable=False)   # 付与日
    expiry_date = Column(Date, nullable=True)      # 有効期限
    reason = Column(Text, nullable=True)           # 付与理由
    
    # リレーションシップ
    user = relationship("User", back_populates="leave_allocations")


# 日報・作業記録モデル
class Report(Base, TimestampMixin):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    report_date = Column(Date, nullable=False)
    content = Column(Text, nullable=False)
    tasks_completed = Column(Text, nullable=True)
    tasks_planned = Column(Text, nullable=True)
    issues = Column(Text, nullable=True)
    
    # リレーションシップ
    user = relationship("User", back_populates="reports")


# リレーションシップを後で設定
Leave.user = relationship("User", foreign_keys=[Leave.user_id], back_populates="leaves")
Leave.admin = relationship("User", foreign_keys=[Leave.admin_id])
TimeAdjustmentRequest.user = relationship("User", foreign_keys=[TimeAdjustmentRequest.user_id], back_populates="adjustment_requests")
TimeAdjustmentRequest.attendance = relationship("Attendance", back_populates="adjustment_requests")