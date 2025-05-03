from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from .base import Base, TimestampMixin

class UserRole(enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)

    attendance_records = relationship("AttendanceRecord", back_populates="user")
    leave_requests = relationship("LeaveRequest", back_populates="user")
    work_schedules = relationship("WorkSchedule", back_populates="user")

class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # clockIn or clockOut
    timestamp = Column(DateTime(timezone=True), nullable=False)
    location = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="attendance_records")

class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # paid, unpaid, sick
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending, approved, rejected
    reason = Column(Text, nullable=False)
    approver_comment = Column(Text)

    user = relationship("User", back_populates="leave_requests")

class WorkSchedule(Base, TimestampMixin):
    __tablename__ = "work_schedules"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    break_duration = Column(Integer, nullable=False)  # in minutes

    user = relationship("User", back_populates="work_schedules")

class MonthlyReport(Base, TimestampMixin):
    __tablename__ = "monthly_reports"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    total_work_days = Column(Integer, nullable=False)
    total_work_hours = Column(Float, nullable=False)
    overtime_hours = Column(Float, nullable=False)
    leaves_taken = Column(JSONB, nullable=False)  # {paid: number, unpaid: number, sick: number} 