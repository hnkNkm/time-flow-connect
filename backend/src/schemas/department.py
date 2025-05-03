from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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

class DepartmentResponse(DepartmentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class DepartmentWithUsers(DepartmentResponse):
    user_count: int

class UserDepartmentAssign(BaseModel):
    user_id: int
    department_id: int

class UserDepartmentResponse(BaseModel):
    user_id: int
    department_id: int
    user_name: str
    department_name: str
    
    class Config:
        orm_mode = True 