from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict
from datetime import datetime, date, time, timedelta
import calendar

from ..database import get_db
from ..models.models import Shift, User, ShiftTemplate, PayrollSetting
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
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="ソート順 (asc: 古い順, desc: 新しい順)"),
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
    if sort_order == "desc":
        query = query.order_by(Shift.date.desc())
    else:
        query = query.order_by(Shift.date.asc())
    
    return query.all()

# 管理者用：全従業員のシフト一覧を取得
@router.get("/admin/all-shifts", response_model=List[ShiftWithUser])
async def get_all_shifts(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="ソート順 (asc: 古い順, desc: 新しい順)"),
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
    
    # 日付順にソート
    if sort_order == "desc":
        query = query.order_by(Shift.date.desc(), User.id)
    else:
        query = query.order_by(Shift.date.asc(), User.id)
    
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

# 月間の確定シフトから見込み給与を計算
@router.get("/estimated-salary/{year}/{month}")
async def get_estimated_salary(
    year: int,
    month: int,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 管理者でない場合は自分の情報のみ取得可能
    if current_user.role != "admin" and user_id and user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="他のユーザーの情報を取得する権限がありません"
        )
    
    # 対象ユーザーの決定
    target_user_id = user_id if user_id else current_user.id
    
    # 対象ユーザーの情報を取得
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 月の開始日と終了日を計算
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # 確定済みシフトを取得
    confirmed_shifts = db.query(Shift).filter(
        Shift.user_id == target_user_id,
        Shift.status == "confirmed",
        Shift.date >= start_date,
        Shift.date <= end_date
    ).all()
    
    # デバッグ用ログ
    print(f"確定済みシフト検索条件: user_id={target_user_id}, start_date={start_date}, end_date={end_date}")
    print(f"取得した確定済みシフト数: {len(confirmed_shifts)}")
    for shift in confirmed_shifts:
        print(f"  - {shift.date}: {shift.status}")
    
    # 給与設定を取得
    payroll_setting = db.query(PayrollSetting).first()
    if not payroll_setting:
        payroll_setting = PayrollSetting(
            overtime_rate=1.25,
            night_shift_rate=1.25,
            holiday_rate=1.35,
            regular_hours_per_day=8
        )
    
    # 時給を取得（デフォルト1000円）
    hourly_rate = getattr(target_user, 'hourly_rate', 1000)
    
    # 合計勤務時間を計算
    total_hours = 0
    total_days = len(confirmed_shifts)
    
    for shift in confirmed_shifts:
        if shift.start_time and shift.end_time:
            # 時間の差を計算
            start_datetime = datetime.combine(shift.date, shift.start_time)
            end_datetime = datetime.combine(shift.date, shift.end_time)
            
            # 日をまたぐシフトの場合
            if end_datetime < start_datetime:
                end_datetime += timedelta(days=1)
            
            duration = end_datetime - start_datetime
            hours = duration.total_seconds() / 3600
            total_hours += hours
    
    # 残業時間の計算
    regular_hours = total_days * payroll_setting.regular_hours_per_day
    overtime_hours = max(0, total_hours - regular_hours)
    
    # 給与の計算
    regular_pay = regular_hours * hourly_rate
    overtime_pay = overtime_hours * hourly_rate * payroll_setting.overtime_rate
    total_salary = regular_pay + overtime_pay
    
    return {
        "year": year,
        "month": month,
        "user_id": target_user_id,
        "user_name": target_user.full_name,
        "confirmed_shifts_count": total_days,
        "total_hours": round(total_hours, 2),
        "regular_hours": round(regular_hours, 2),
        "overtime_hours": round(overtime_hours, 2),
        "hourly_rate": hourly_rate,
        "regular_pay": int(regular_pay),
        "overtime_pay": int(overtime_pay),
        "estimated_salary": int(total_salary)
    }

# ここに他のエンドポイントが続く... (get_my_shifts, get_all_shifts など)
# ... existing code ... 