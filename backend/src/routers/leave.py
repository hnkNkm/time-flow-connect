from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from typing import List, Optional
from datetime import datetime, date, timedelta
import calendar

from ..database import get_db
from ..models.models import Leave, LeaveAllocation, User
from ..schemas.leave import (
    LeaveCreate,
    LeaveUpdate,
    LeaveResponse,
    LeaveWithUser,
    LeaveBalance,
    LeaveBalanceUpdate,
    LeaveAllocation as LeaveAllocationSchema,
    LeaveType,
    LeaveStatus
)
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/leaves", tags=["leaves"])

# 休暇日数を計算するヘルパー関数
def calculate_leave_days(start_date: date, end_date: date) -> float:
    # 平日のみをカウント（土日を除外）
    days_count = 0
    current_date = start_date
    
    while current_date <= end_date:
        # 0: 月曜, 1: 火曜, ..., 5: 土曜, 6: 日曜
        if current_date.weekday() < 5:  # 平日のみ
            days_count += 1
        current_date += timedelta(days=1)
    
    return days_count

# 休暇申請の作成
@router.post("", response_model=LeaveResponse)
async def create_leave_request(
    leave: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 開始日が終了日より後の場合はエラー
    if leave.start_date > leave.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="開始日は終了日より前である必要があります"
        )
    
    # 休暇日数を計算
    days_count = calculate_leave_days(leave.start_date, leave.end_date)
    
    # 有給休暇の場合、残日数を確認
    if leave.leave_type == LeaveType.PAID:
        leave_balance = get_user_leave_balance(db, current_user.id)
        
        if days_count > leave_balance["remaining_paid_leave"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"有給休暇の残日数が不足しています。申請: {days_count}日, 残日数: {leave_balance['remaining_paid_leave']}日"
            )
    
    # 新しい休暇申請を作成
    new_leave = Leave(
        user_id=current_user.id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days_count=days_count,
        leave_type=leave.leave_type.value if isinstance(leave.leave_type, LeaveType) else leave.leave_type,
        reason=leave.reason,
        status="pending"
    )
    
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    
    return new_leave

# 自分の休暇申請一覧を取得
@router.get("/my-requests", response_model=List[LeaveResponse])
async def get_my_leave_requests(
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Leave).filter(Leave.user_id == current_user.id)
    
    if status:
        query = query.filter(Leave.status == status)
    
    if start_date:
        query = query.filter(or_(
            Leave.start_date >= start_date,
            Leave.end_date >= start_date
        ))
    
    if end_date:
        query = query.filter(or_(
            Leave.start_date <= end_date,
            Leave.end_date <= end_date
        ))
    
    # 日付の降順でソート
    query = query.order_by(Leave.start_date.desc())
    
    return query.all()

# 管理者用：全ユーザーの休暇申請一覧を取得
@router.get("/admin/all-requests", response_model=List[LeaveWithUser])
async def get_all_leave_requests(
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 基本クエリ
    query = (
        db.query(
            Leave,
            User.full_name.label("user_full_name")
        )
        .join(User, Leave.user_id == User.id)
    )
    
    # フィルタリング
    if status:
        query = query.filter(Leave.status == status)
    
    if user_id:
        query = query.filter(Leave.user_id == user_id)
    
    if start_date:
        query = query.filter(or_(
            Leave.start_date >= start_date,
            Leave.end_date >= start_date
        ))
    
    if end_date:
        query = query.filter(or_(
            Leave.start_date <= end_date,
            Leave.end_date <= end_date
        ))
    
    # 日付の降順でソート
    query = query.order_by(Leave.start_date.desc())
    
    # 結果を整形
    result = []
    for leave, user_full_name in query.all():
        leave_dict = {
            **vars(leave),
            "user_full_name": user_full_name,
            "admin_full_name": None
        }
        
        # 管理者名を取得
        if leave.admin_id:
            admin = db.query(User).filter(User.id == leave.admin_id).first()
            if admin:
                leave_dict["admin_full_name"] = admin.full_name
        
        # SQLAlchemyの内部属性を削除
        if "_sa_instance_state" in leave_dict:
            del leave_dict["_sa_instance_state"]
        
        result.append(leave_dict)
    
    return result

# 管理者用：休暇申請の承認/拒否
@router.put("/admin/{leave_id}", response_model=LeaveResponse)
async def update_leave_request(
    leave_id: int,
    leave_data: LeaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された休暇申請が見つかりません"
        )
    
    # 既に承認/拒否されている場合はエラー
    if leave.status != "pending" and leave_data.status in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"この休暇申請は既に {leave.status} 状態です"
        )
    
    # データの更新
    if leave_data.start_date is not None:
        leave.start_date = leave_data.start_date
    
    if leave_data.end_date is not None:
        leave.end_date = leave_data.end_date
    
    if leave_data.leave_type is not None:
        leave.leave_type = leave_data.leave_type.value if isinstance(leave_data.leave_type, LeaveType) else leave_data.leave_type
    
    if leave_data.reason is not None:
        leave.reason = leave_data.reason
    
    if leave_data.status is not None:
        leave.status = leave_data.status.value if isinstance(leave_data.status, LeaveStatus) else leave_data.status
        leave.admin_id = current_user.id
    
    if leave_data.admin_comment is not None:
        leave.admin_comment = leave_data.admin_comment
    
    # 日付が変更された場合は休暇日数を再計算
    if leave_data.start_date is not None or leave_data.end_date is not None:
        leave.days_count = calculate_leave_days(leave.start_date, leave.end_date)
    
    leave.updated_at = datetime.now()
    
    db.commit()
    db.refresh(leave)
    
    return leave

# 自分の有給休暇残日数を取得
@router.get("/my-balance", response_model=LeaveBalance)
async def get_my_leave_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    balance = get_user_leave_balance(db, current_user.id)
    
    return {
        "user_id": current_user.id,
        "user_full_name": current_user.full_name,
        "total_paid_leave": balance["total_paid_leave"],
        "used_paid_leave": balance["used_paid_leave"],
        "remaining_paid_leave": balance["remaining_paid_leave"],
        "upcoming_paid_leave": balance["upcoming_paid_leave"]
    }

# 管理者用：ユーザーの有給休暇残日数を取得
@router.get("/admin/user-balance/{user_id}", response_model=LeaveBalance)
async def get_user_leave_balance_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません"
        )
    
    balance = get_user_leave_balance(db, user_id)
    
    return {
        "user_id": user.id,
        "user_full_name": user.full_name,
        "total_paid_leave": balance["total_paid_leave"],
        "used_paid_leave": balance["used_paid_leave"],
        "remaining_paid_leave": balance["remaining_paid_leave"],
        "upcoming_paid_leave": balance["upcoming_paid_leave"]
    }

# 管理者用：有給休暇の付与
@router.post("/admin/allocate", response_model=LeaveAllocationSchema)
async def allocate_leave(
    allocation_data: LeaveBalanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == allocation_data.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません"
        )
    
    # 新しい有給休暇付与を作成
    allocation = LeaveAllocation(
        user_id=allocation_data.user_id,
        allocated_days=allocation_data.paid_leave_days,
        effective_date=allocation_data.effective_date,
        expiry_date=allocation_data.effective_date.replace(year=allocation_data.effective_date.year + 1),  # 1年後を有効期限とする
        reason=allocation_data.reason
    )
    
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    
    return {
        "id": allocation.id,
        "user_id": allocation.user_id,
        "user_full_name": user.full_name,
        "allocated_days": allocation.allocated_days,
        "effective_date": allocation.effective_date,
        "expiry_date": allocation.expiry_date,
        "reason": allocation.reason,
        "created_at": allocation.created_at,
        "updated_at": allocation.updated_at
    }

# ユーザーの有給休暇残日数を計算するヘルパー関数
def get_user_leave_balance(db: Session, user_id: int) -> dict:
    # 付与された全有給休暇日数
    allocations = db.query(LeaveAllocation).filter(
        LeaveAllocation.user_id == user_id,
        # 有効期限が過ぎていないか期限なし
        or_(
            LeaveAllocation.expiry_date >= date.today(),
            LeaveAllocation.expiry_date == None
        )
    ).all()
    
    total_allocated = sum(alloc.allocated_days for alloc in allocations)
    
    # 使用済み有給休暇日数（承認済みのみ）
    used_leaves = db.query(func.sum(Leave.days_count)).filter(
        Leave.user_id == user_id,
        Leave.leave_type == "paid",
        Leave.status == "approved"
    ).scalar() or 0
    
    # 申請中の有給休暇日数
    pending_leaves = db.query(func.sum(Leave.days_count)).filter(
        Leave.user_id == user_id,
        Leave.leave_type == "paid",
        Leave.status == "pending"
    ).scalar() or 0
    
    # 残り有給休暇日数
    remaining_leave = total_allocated - float(used_leaves)
    
    return {
        "total_paid_leave": total_allocated,
        "used_paid_leave": float(used_leaves),
        "remaining_paid_leave": remaining_leave,
        "upcoming_paid_leave": float(pending_leaves)
    } 