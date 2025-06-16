from pydantic import EmailStr, Field, computed_field, field_validator
from typing import Optional
from datetime import datetime
from .base import BaseSchema, TimestampSchema, IdSchema
from .common import UserRole


class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseSchema):
    username: Optional[str] = None


class UserBase(BaseSchema):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    hourly_rate: float = Field(default=0.0, ge=0, description="時給")
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """ユーザー名は英数字、ハイフン、アンダースコアのみ"""
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('ユーザー名は英数字、ハイフン、アンダースコアのみ使用できます')
        return v.lower()  # 小文字に統一


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole = Field(default=UserRole.EMPLOYEE)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """パスワードの複雑性を検証"""
        if not any(char.isdigit() for char in v):
            raise ValueError('パスワードには最低1つの数字を含める必要があります')
        if not any(char.isalpha() for char in v):
            raise ValueError('パスワードには最低1つの文字を含める必要があります')
        return v


class UserUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    hourly_rate: Optional[float] = Field(None, ge=0)


class UserResponse(UserBase, IdSchema, TimestampSchema):
    role: UserRole
    is_active: bool = True
    force_password_change: bool = False
    
    @computed_field
    @property
    def is_admin(self) -> bool:
        """管理者権限を持つかどうか"""
        return self.role in [UserRole.ADMIN, UserRole.MANAGER]
    
    @computed_field
    @property
    def display_name(self) -> str:
        """表示用の名前（フルネーム優先）"""
        return self.full_name if self.full_name else self.username


class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v, info):
        """新しいパスワードの検証"""
        if 'current_password' in info.data and v == info.data['current_password']:
            raise ValueError('新しいパスワードは現在のパスワードと異なる必要があります')
        # パスワードの複雑性チェック
        if not any(char.isdigit() for char in v):
            raise ValueError('パスワードには最低1つの数字を含める必要があります')
        if not any(char.isalpha() for char in v):
            raise ValueError('パスワードには最低1つの文字を含める必要があります')
        return v


class PasswordResetRequest(BaseSchema):
    """パスワードリセット要求"""
    email: EmailStr


class PasswordResetConfirm(BaseSchema):
    """パスワードリセット確認"""
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)