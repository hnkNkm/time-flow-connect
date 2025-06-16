"""
SQLAlchemyとPydanticで共通で使用するEnum定義
"""
import enum


class ShiftStatus(enum.Enum):
    """シフトステータス"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class ShiftAvailability(enum.Enum):
    """シフト可否状態"""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PREFER = "prefer"
    PREFER_NOT = "prefer_not"
    ANY = "any"


class LeaveType(enum.Enum):
    """休暇タイプ"""
    PAID = "paid"
    UNPAID = "unpaid"
    SICK = "sick"
    SPECIAL = "special"


class LeaveStatus(enum.Enum):
    """休暇申請ステータス"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELED = "canceled"


class AdjustmentStatus(enum.Enum):
    """打刻修正申請ステータス"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class UserRole(enum.Enum):
    """ユーザーロール"""
    EMPLOYEE = "employee"
    ADMIN = "admin"
    MANAGER = "manager"