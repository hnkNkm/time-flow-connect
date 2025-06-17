from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TimestampMixin(BaseModel):
    """共通のタイムスタンプフィールドを提供するミックスイン"""
    created_at: datetime
    updated_at: Optional[datetime] = None


class OrmConfigMixin(BaseModel):
    """ORMモード設定を提供するミックスイン"""
    class Config:
        orm_mode = True
        from_attributes = True


class AdminActionMixin(BaseModel):
    """管理者アクション関連フィールドを提供するミックスイン"""
    admin_id: Optional[int] = None
    admin_comment: Optional[str] = None


class UserInfoMixin(BaseModel):
    """ユーザー情報関連フィールドを提供するミックスイン"""
    user_id: int
    user_full_name: str


class BaseResponse(TimestampMixin, OrmConfigMixin):
    """全てのResponseスキーマの基底クラス"""
    id: int