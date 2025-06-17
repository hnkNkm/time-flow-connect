from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .base import BaseResponse, OrmConfigMixin

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase, BaseResponse):
    is_active: bool

class DepartmentWithUsers(DepartmentResponse):
    user_count: int

class UserDepartmentAssign(BaseModel):
    user_id: int
    department_id: int

class UserDepartmentResponse(OrmConfigMixin):
    user_id: int
    department_id: int
    user_name: str
    department_name: str 