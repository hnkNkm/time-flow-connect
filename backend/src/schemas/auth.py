from pydantic import BaseModel, EmailStr, Field, computed_field
from typing import Optional
from datetime import datetime
from .base import BaseResponse

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    email: EmailStr
    full_name: str
    hourly_rate: float = 0.0

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: str = "employee"

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    hourly_rate: Optional[float] = None

class UserResponse(UserBase, BaseResponse):
    role: str
    is_active: bool
    force_password_change: bool

    @computed_field
    def is_admin(self) -> bool:
        return self.role == "admin"

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6) 