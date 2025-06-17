from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict
from datetime import datetime, date, time, timedelta
import calendar

from ..database import get_db
from ..models.models import Shift, User, ShiftTemplate
from ..schemas.shift import (
    ShiftCreate,
    ShiftUpdate,
    ShiftResponse,
    ShiftWithUser,
    ShiftTemplateCreate,
    ShiftTemplateResponse,
    MonthlyShiftRequest,
    ConfirmShiftData,
    ShiftSummaryResponse,
    ShiftStatus,
    ShiftAvailability
)
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

# シフトテンプレートの作成（管理者のみ）
@router.post("/templates", response_model=ShiftTemplateResponse)
async def create_shift_template(
    template: ShiftTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_template = ShiftTemplate(
        name=template.name,
        start_time=template.start_time,
        end_time=template.end_time,
        description=template.description
    )
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return db_template

# シフトテンプレート一覧取得
@router.get("/templates", response_model=List[ShiftTemplateResponse])
async def get_shift_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    templates = db.query(ShiftTemplate).all()
    return templates

# シフト希望の提出（従業員）
@router.post("", response_model=ShiftResponse)
async def create_shift_request(
    shift: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 同じ日に既存のシフト希望がないか確認
    existing_shift = db.query(Shift).filter(
        Shift.user_id == current_user.id,
        Shift.date == shift.date
    ).first()
    
    if existing_shift:
        # 既存のものを更新
        existing_shift.availability = shift.availability.value if isinstance(shift.availability, ShiftAvailability) else shift.availability
        existing_shift.start_time = shift.start_time
        existing_shift.end_time = shift.end_time
        existing_shift.memo = shift.memo
        existing_shift.updated_at = datetime.now()
        
        db.commit()
        db.refresh(existing_shift)
        return existing_shift
    
    # 新しいシフト希望を作成
    new_shift = Shift(
        user_id=current_user.id,
        date=shift.date,
        availability=shift.availability.value if isinstance(shift.availability, ShiftAvailability) else shift.availability,
        start_time=shift.start_time,
        end_time=shift.end_time,
        memo=shift.memo,
        status="pending"
    )
    
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    
    return new_shift

# 月間シフト希望の一括提出
@router.post("/bulk", response_model=List[ShiftResponse])
async def create_bulk_shift_requests(
    request: MonthlyShiftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = []
    
    for shift in request.shifts:
        # 同じ日に既存のシフト希望がないか確認
        existing_shift = db.query(Shift).filter(
            Shift.user_id == current_user.id,
            Shift.date == shift.date
        ).first()
        
        if existing_shift:
            # 既存のものを更新
            existing_shift.availability = shift.availability.value if isinstance(shift.availability, ShiftAvailability) else shift.availability
            existing_shift.start_time = shift.start_time
            existing_shift.end_time = shift.end_time
            existing_shift.memo = shift.memo
            existing_shift.updated_at = datetime.now()
            
            db.commit()
            db.refresh(existing_shift)
            result.append(existing_shift)
        else:
            # 新しいシフト希望を作成
            new_shift = Shift(
                user_id=current_user.id,
                date=shift.date,
                availability=shift.availability.value if isinstance(shift.availability, ShiftAvailability) else shift.availability,
                start_time=shift.start_time,
                end_time=shift.end_time,
                memo=shift.memo,
                status="pending"
            )
            
            db.add(new_shift)
            db.commit()
            db.refresh(new_shift)
            result.append(new_shift)
    
    return result

# 自分のシフトを取得
@router.get("/my-shifts", response_model=List[ShiftResponse])
async def get_my_shifts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Shift).filter(Shift.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Shift.date >= start_date)
    
    if end_date:
        query = query.filter(Shift.date <= end_date)
    
    if status:
        query = query.filter(Shift.status == status)
    
    # 日付順にソート
    query = query.order_by(Shift.date)
    
    return query.all()

# 管理者用：全従業員のシフト一覧を取得
@router.get("/admin/all-shifts", response_model=List[ShiftWithUser])
async def get_all_shifts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 基本クエリ
    query = (
        db.query(
            Shift,
            User.full_name.label("user_full_name")
        )
        .join(User, Shift.user_id == User.id)
    )
    
    # フィルタリング
    if start_date:
        query = query.filter(Shift.date >= start_date)
    
    if end_date:
        query = query.filter(Shift.date <= end_date)
    
    if user_id:
        query = query.filter(Shift.user_id == user_id)
    
    if status:
        query = query.filter(Shift.status == status)
    
    # 日付順、ユーザーID順にソート
    query = query.order_by(Shift.date, User.id)
    
    # 結果を整形
    result = []
    for record, user_full_name in query.all():
        shift_dict = {
            **vars(record),
            "user_full_name": user_full_name
        }
        # SQLAlchemyの内部属性を削除
        if "_sa_instance_state" in shift_dict:
            del shift_dict["_sa_instance_state"]
        
        result.append(shift_dict)
    
    return result

# 管理者用：日別のシフトサマリーを取得
@router.get("/admin/summary", response_model=List[ShiftSummaryResponse])
async def get_shift_summary(
    start_date: date = Query(..., description="開始日"),
    end_date: date = Query(..., description="終了日"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 日別の集計
    date_range = (end_date - start_date).days + 1
    result = []
    
    for i in range(date_range):
        current_date = start_date + timedelta(days=i)
        
        # この日のシフト情報を取得
        shifts = (
            db.query(
                Shift,
                User.full_name.label("user_full_name")
            )
            .join(User, Shift.user_id == User.id)
            .filter(Shift.date == current_date)
            .all()
        )
        
        # 集計情報
        total_shifts = len(shifts)
        confirmed_shifts = sum(1 for shift, _ in shifts if shift.status == "confirmed")
        
        # ユーザー情報の整形
        users_data = []
        for shift, user_full_name in shifts:
            users_data.append({
                "user_id": shift.user_id,
                "user_name": user_full_name,
                "start_time": shift.start_time.isoformat() if shift.start_time else None,
                "end_time": shift.end_time.isoformat() if shift.end_time else None,
                "availability": shift.availability,
                "status": shift.status
            })
        
        # 日別の結果を追加
        result.append({
            "date": current_date,
            "total_shifts": total_shifts,
            "confirmed_shifts": confirmed_shifts,
            "users": users_data
        })
    
    return result

# 管理者用：シフトステータスの一括更新（承認/拒否）
@router.put("/admin/confirm", response_model=List[ShiftResponse])
async def confirm_shifts(
    data: ConfirmShiftData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    result = []
    
    for shift_id in data.shifts:
        shift = db.query(Shift).filter(Shift.id == shift_id).first()
        
        if not shift:
            continue  # このシフトが見つからない場合はスキップ
        
        # シフトのステータスを更新
        shift.status = data.status.value if isinstance(data.status, ShiftStatus) else data.status
        shift.admin_id = current_user.id
        shift.admin_comment = data.admin_comment
        shift.updated_at = datetime.now()
        
        result.append(shift)
    
    db.commit()
    
    # 更新後のデータをリフレッシュ
    for i, shift in enumerate(result):
        db.refresh(shift)
    
    return result

# 管理者用：シフト情報の更新
@router.put("/admin/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたシフトが見つかりません"
        )
    
    # 値を更新
    if shift_data.availability is not None:
        shift.availability = shift_data.availability.value if isinstance(shift_data.availability, ShiftAvailability) else shift_data.availability
    
    if shift_data.start_time is not None:
        shift.start_time = shift_data.start_time
    
    if shift_data.end_time is not None:
        shift.end_time = shift_data.end_time
    
    if shift_data.memo is not None:
        shift.memo = shift_data.memo
    
    if shift_data.status is not None:
        shift.status = shift_data.status.value if isinstance(shift_data.status, ShiftStatus) else shift_data.status
        shift.admin_id = current_user.id
    
    shift.updated_at = datetime.now()
    
    db.commit()
    db.refresh(shift)
    
    return shift

# 管理者用：シフトの承認
@router.put("/{shift_id}/approve", response_model=ShiftResponse)
async def approve_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    指定されたシフトを承認します（管理者のみ）。
    """
    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with id {shift_id} not found"
        )

    # ShiftStatus Enum が schemas に定義されているか確認
    try:
        from ..schemas.shift import ShiftStatus
        shift.status = ShiftStatus.CONFIRMED.value
    except ImportError:
        # Enum がない場合は文字列で指定
        shift.status = "confirmed"
        
    shift.updated_at = datetime.now()

    db.commit()
    db.refresh(shift)
    return shift

# 管理者用：シフトの却下
@router.put("/{shift_id}/reject", response_model=ShiftResponse)
async def reject_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """
    指定されたシフトを却下します（管理者のみ）。
    """
    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with id {shift_id} not found"
        )
    
    # ShiftStatus Enum が schemas に定義されているか確認
    try:
        from ..schemas.shift import ShiftStatus
        shift.status = ShiftStatus.REJECTED.value
    except ImportError:
        # Enum がない場合は文字列で指定
        shift.status = "rejected"

    shift.updated_at = datetime.now()

    db.commit()
    db.refresh(shift)
    return shift

# シフトの削除（自分のシフトのみ削除可能）
@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shift with id {shift_id} not found"
        )
    
    # 自分のシフトか、管理者の場合のみ削除可能
    if shift.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このシフトを削除する権限がありません"
        )
    
    # pendingステータスのシフトのみ削除可能
    if shift.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="確定済みまたは却下済みのシフトは削除できません"
        )
    
    db.delete(shift)
    db.commit()
    return

# 管理者用：シフトの削除（任意：必要であれば追加）
# @router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
# async def delete_shift(
#     shift_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_admin_user)
# ):
#     shift = db.query(Shift).filter(Shift.id == shift_id).first()
#     if not shift:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail=f"Shift with id {shift_id} not found"
#         )
    
#     db.delete(shift)
#     db.commit()
#     return

# ここに他のエンドポイントが続く... (get_my_shifts, get_all_shifts など)
# ... existing code ... 