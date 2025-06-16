"""
共通の依存性注入
"""
from typing import Optional, Callable
from fastapi import Depends, Query
from sqlalchemy.orm import Session
from datetime import date, datetime

from ..database import get_db
from ..models.models import User
from ..models.enums import UserRole
from ..auth.auth import get_current_user
from .exceptions import ForbiddenException


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """アクティブなユーザーのみ許可"""
    if not current_user.is_active:
        raise ForbiddenException("アカウントが無効です")
    return current_user


def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """管理者ユーザーのみ許可"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise ForbiddenException("管理者権限が必要です")
    return current_user


def get_current_manager_user(current_user: User = Depends(get_current_active_user)) -> User:
    """マネージャー以上のユーザーのみ許可"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise ForbiddenException("マネージャー権限が必要です")
    return current_user


class RoleChecker:
    """ロールベースのアクセス制御"""
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(
                f"このリソースへのアクセスには {', '.join([r.value for r in self.allowed_roles])} 権限が必要です"
            )
        return current_user


class PaginationParams:
    """ページネーションパラメータ"""
    def __init__(
        self,
        skip: int = Query(default=0, ge=0, description="スキップする件数"),
        limit: int = Query(default=20, ge=1, le=100, description="取得する件数")
    ):
        self.skip = skip
        self.limit = limit


class DateRangeParams:
    """日付範囲パラメータ"""
    def __init__(
        self,
        start_date: Optional[date] = Query(None, description="開始日"),
        end_date: Optional[date] = Query(None, description="終了日")
    ):
        self.start_date = start_date
        self.end_date = end_date
        
        # 終了日が開始日より前の場合はエラー
        if start_date and end_date and end_date < start_date:
            raise ForbiddenException("終了日は開始日以降でなければなりません")


class MonthParams:
    """年月パラメータ"""
    def __init__(
        self,
        year: int = Query(..., ge=2000, le=2100, description="年"),
        month: int = Query(..., ge=1, le=12, description="月")
    ):
        self.year = year
        self.month = month


def check_resource_owner(
    resource_user_id: int,
    current_user: User,
    allow_admin: bool = True
) -> None:
    """リソースの所有者チェック"""
    if resource_user_id != current_user.id:
        if not allow_admin or current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            raise ForbiddenException("このリソースへのアクセス権限がありません")


def get_db_transaction():
    """トランザクション管理のための依存性"""
    db = next(get_db())
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()