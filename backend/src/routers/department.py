from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import Department, UserDepartment, User
from ..schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentWithUsers,
    UserDepartmentAssign,
    UserDepartmentResponse
)
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/departments", tags=["departments"])

# 部署の作成（管理者のみ）
@router.post("", response_model=DepartmentResponse)
async def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 同じ名前の部署が存在しないか確認
    existing_department = db.query(Department).filter(
        Department.name == department.name
    ).first()
    
    if existing_department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="同じ名前の部署/現場が既に存在します"
        )
    
    # 新しい部署を作成
    new_department = Department(
        name=department.name,
        description=department.description,
        location=department.location,
        is_active=True
    )
    
    db.add(new_department)
    db.commit()
    db.refresh(new_department)
    
    return new_department

# 部署の一覧取得
@router.get("", response_model=List[DepartmentResponse])
async def get_departments(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Department)
    
    # 非アクティブな部署をフィルタリング
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    
    # 名前順にソート
    query = query.order_by(Department.name)
    
    return query.all()

# 部署詳細の取得
@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    department = db.query(Department).filter(Department.id == department_id).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された部署/現場が見つかりません"
        )
    
    return department

# 部署情報の更新（管理者のみ）
@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    department_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    department = db.query(Department).filter(Department.id == department_id).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された部署/現場が見つかりません"
        )
    
    # 名前の重複チェック
    if department_data.name and department_data.name != department.name:
        existing_department = db.query(Department).filter(
            Department.name == department_data.name,
            Department.id != department_id
        ).first()
        
        if existing_department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="同じ名前の部署/現場が既に存在します"
            )
    
    # データの更新
    if department_data.name is not None:
        department.name = department_data.name
    
    if department_data.description is not None:
        department.description = department_data.description
    
    if department_data.location is not None:
        department.location = department_data.location
    
    if department_data.is_active is not None:
        department.is_active = department_data.is_active
    
    department.updated_at = datetime.now()
    
    db.commit()
    db.refresh(department)
    
    return department

# 部署とユーザー数を取得（管理者用）
@router.get("/admin/with-user-count", response_model=List[DepartmentWithUsers])
async def get_departments_with_user_count(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # サブクエリで部署ごとのユーザー数を取得
    user_count_subq = (
        db.query(
            UserDepartment.department_id,
            func.count(UserDepartment.user_id).label("user_count")
        )
        .group_by(UserDepartment.department_id)
        .subquery()
    )
    
    # 部署クエリ
    query = (
        db.query(
            Department,
            func.coalesce(user_count_subq.c.user_count, 0).label("user_count")
        )
        .outerjoin(user_count_subq, Department.id == user_count_subq.c.department_id)
    )
    
    # 非アクティブな部署をフィルタリング
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    
    # 名前順にソート
    query = query.order_by(Department.name)
    
    # 結果を整形
    result = []
    for department, user_count in query.all():
        department_dict = {
            **vars(department),
            "user_count": user_count
        }
        # SQLAlchemyの内部属性を削除
        if "_sa_instance_state" in department_dict:
            del department_dict["_sa_instance_state"]
        
        result.append(department_dict)
    
    return result

# ユーザーを部署に割り当て（管理者のみ）
@router.post("/assign", response_model=UserDepartmentResponse)
async def assign_user_to_department(
    assignment: UserDepartmentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # ユーザーと部署の存在確認
    user = db.query(User).filter(User.id == assignment.user_id).first()
    department = db.query(Department).filter(Department.id == assignment.department_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません"
        )
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された部署/現場が見つかりません"
        )
    
    # 既に割り当てられていないか確認
    existing_assignment = db.query(UserDepartment).filter(
        UserDepartment.user_id == assignment.user_id,
        UserDepartment.department_id == assignment.department_id
    ).first()
    
    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このユーザーは既に指定された部署/現場に割り当てられています"
        )
    
    # 新しい割り当てを作成
    new_assignment = UserDepartment(
        user_id=assignment.user_id,
        department_id=assignment.department_id
    )
    
    db.add(new_assignment)
    db.commit()
    
    # レスポンスデータを作成
    response = {
        "user_id": assignment.user_id,
        "department_id": assignment.department_id,
        "user_name": user.full_name,
        "department_name": department.name
    }
    
    return response

# ユーザーの部署割り当てを解除（管理者のみ）
@router.delete("/unassign/{user_id}/{department_id}")
async def unassign_user_from_department(
    user_id: int,
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 割り当ての確認
    assignment = db.query(UserDepartment).filter(
        UserDepartment.user_id == user_id,
        UserDepartment.department_id == department_id
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーと部署/現場の組み合わせが見つかりません"
        )
    
    # 割り当てを削除
    db.delete(assignment)
    db.commit()
    
    return {"message": "ユーザーの部署割り当てを解除しました"}

# 部署に属するユーザー一覧を取得
@router.get("/{department_id}/users", response_model=List[UserDepartmentResponse])
async def get_department_users(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 部署の存在確認
    department = db.query(Department).filter(Department.id == department_id).first()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された部署/現場が見つかりません"
        )
    
    # 部署に属するユーザーを取得
    query = (
        db.query(
            UserDepartment.user_id,
            UserDepartment.department_id,
            User.full_name.label("user_name"),
            Department.name.label("department_name")
        )
        .join(User, UserDepartment.user_id == User.id)
        .join(Department, UserDepartment.department_id == Department.id)
        .filter(UserDepartment.department_id == department_id)
        .order_by(User.full_name)
    )
    
    result = []
    for user_id, department_id, user_name, department_name in query.all():
        result.append({
            "user_id": user_id,
            "department_id": department_id,
            "user_name": user_name,
            "department_name": department_name
        })
    
    return result

# ユーザーが所属する部署一覧を取得
@router.get("/user/{user_id}", response_model=List[DepartmentResponse])
async def get_user_departments(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # ユーザーの存在確認
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません"
        )
    
    # 自分自身か管理者のみ閲覧可能
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="他のユーザーの所属部署を閲覧する権限がありません"
        )
    
    # ユーザーが所属する部署を取得
    departments = (
        db.query(Department)
        .join(UserDepartment, Department.id == UserDepartment.department_id)
        .filter(UserDepartment.user_id == user_id)
        .filter(Department.is_active == True)
        .order_by(Department.name)
        .all()
    )
    
    return departments 