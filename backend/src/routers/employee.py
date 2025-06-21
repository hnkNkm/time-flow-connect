from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.models import User, Department
from ..schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeListResponse,
    PasswordChange,
    AdminPasswordReset
)
from ..auth.auth import get_current_admin_user, get_current_active_user, get_password_hash, verify_password

router = APIRouter(prefix="/api/employees", tags=["employees"])

# 従業員一覧取得（管理者のみ）
@router.get("", response_model=EmployeeListResponse)
async def get_employees(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    search: Optional[str] = Query(None, description="検索キーワード（名前、メール、社員コード）"),
    department_id: Optional[int] = Query(None, description="部署ID"),
    employment_type: Optional[str] = Query(None, description="雇用形態"),
    is_active: Optional[bool] = Query(None, description="アクティブステータス"),
    sort_by: str = Query("created_at", description="ソートフィールド"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="ソート順"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 基本クエリ
    query = db.query(User).options(joinedload(User.department))
    
    # 検索フィルタ
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.employee_code.ilike(f"%{search}%")
            )
        )
    
    # 部署フィルタ
    if department_id:
        query = query.filter(User.department_id == department_id)
    
    # 雇用形態フィルタ
    if employment_type:
        query = query.filter(User.employment_type == employment_type)
    
    # アクティブステータスフィルタ
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # ソート
    if hasattr(User, sort_by):
        order_column = getattr(User, sort_by)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
    
    # ページネーション
    total = query.count()
    total_pages = (total + per_page - 1) // per_page
    offset = (page - 1) * per_page
    
    employees = query.offset(offset).limit(per_page).all()
    
    return EmployeeListResponse(
        items=employees,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

# 従業員詳細取得
@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 管理者または本人のみアクセス可能
    if current_user.role != "admin" and current_user.id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーの情報を閲覧する権限がありません"
        )
    
    employee = db.query(User).options(joinedload(User.department)).filter(User.id == employee_id).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された従業員が見つかりません"
        )
    
    return employee

# 新規従業員登録（管理者のみ）
@router.post("", response_model=EmployeeResponse)
async def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 既存ユーザーのチェック
    existing_user = db.query(User).filter(
        or_(
            User.username == employee_data.username,
            User.email == employee_data.email
        )
    ).first()
    
    if existing_user:
        if existing_user.username == employee_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このユーザー名は既に使用されています"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に使用されています"
            )
    
    # 社員番号の重複チェック
    if employee_data.employee_code:
        existing_employee = db.query(User).filter(User.employee_code == employee_data.employee_code).first()
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="この社員コードは既に使用されています"
            )
    
    # 新規ユーザー作成
    new_employee = User(
        **employee_data.dict(exclude={"password"}),
        hashed_password=get_password_hash(employee_data.password),
        force_password_change=True  # 新規登録時は初回パスワード変更を必須にする
    )
    
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    # 部署情報を含めて返す
    employee = db.query(User).options(joinedload(User.department)).filter(User.id == new_employee.id).first()
    
    return employee

# 従業員情報更新
@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 管理者または本人のみ更新可能（ただし、本人は限定的な項目のみ）
    is_admin = current_user.role == "admin"
    is_self = current_user.id == employee_id
    
    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このユーザーの情報を更新する権限がありません"
        )
    
    employee = db.query(User).filter(User.id == employee_id).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された従業員が見つかりません"
        )
    
    # 更新可能な項目の制限（本人の場合）
    update_data = employee_data.dict(exclude_unset=True)
    
    if not is_admin:
        # 本人が更新できる項目を制限
        allowed_fields = ["phone_number", "emergency_contact", "emergency_phone", "address"]
        update_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    # メールアドレスの重複チェック
    if "email" in update_data and update_data["email"] != employee.email:
        existing_user = db.query(User).filter(User.email == update_data["email"]).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に使用されています"
            )
    
    # 社員番号の重複チェック
    if "employee_id" in update_data and update_data["employee_id"] != employee.employee_code:
        existing_employee = db.query(User).filter(User.employee_code == update_data["employee_id"]).first()
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="この社員コードは既に使用されています"
            )
    
    # 更新
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    employee.updated_at = datetime.now()
    
    db.commit()
    db.refresh(employee)
    
    # 部署情報を含めて返す
    employee = db.query(User).options(joinedload(User.department)).filter(User.id == employee_id).first()
    
    return employee

# パスワード変更（本人のみ）
@router.post("/password/change")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 現在のパスワードを確認
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="現在のパスワードが正しくありません"
        )
    
    # 新しいパスワードを設定
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.force_password_change = False
    current_user.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "パスワードが正常に変更されました"}

# 管理者によるパスワードリセット
@router.post("/password/reset")
async def reset_password(
    reset_data: AdminPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    employee = db.query(User).filter(User.id == reset_data.user_id).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された従業員が見つかりません"
        )
    
    # パスワードをリセット
    employee.hashed_password = get_password_hash(reset_data.new_password)
    employee.force_password_change = True  # 次回ログイン時に変更を強制
    employee.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": f"{employee.full_name}のパスワードがリセットされました"}

# 従業員の無効化/有効化（管理者のみ）
@router.put("/{employee_id}/toggle-active")
async def toggle_employee_active(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    employee = db.query(User).filter(User.id == employee_id).first()
    
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された従業員が見つかりません"
        )
    
    # 自分自身は無効化できない
    if employee.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="自分自身を無効化することはできません"
        )
    
    employee.is_active = not employee.is_active
    employee.updated_at = datetime.now()
    
    db.commit()
    
    action = "有効化" if employee.is_active else "無効化"
    return {"message": f"{employee.full_name}を{action}しました", "is_active": employee.is_active}