"""
共通のEnum定義とバリデーション
"""
from enum import Enum


class ShiftStatus(str, Enum):
    """シフトステータス"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class ShiftAvailability(str, Enum):
    """シフト可否状態"""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PREFER = "prefer"
    PREFER_NOT = "prefer_not"
    ANY = "any"


class LeaveType(str, Enum):
    """休暇タイプ"""
    PAID = "paid"
    UNPAID = "unpaid"
    SICK = "sick"
    SPECIAL = "special"


class LeaveStatus(str, Enum):
    """休暇申請ステータス"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELED = "canceled"


class AdjustmentStatus(str, Enum):
    """打刻修正申請ステータス"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class UserRole(str, Enum):
    """ユーザーロール"""
    EMPLOYEE = "employee"
    ADMIN = "admin"
    MANAGER = "manager"