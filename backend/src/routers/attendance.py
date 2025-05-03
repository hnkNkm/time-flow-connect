from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import calendar

from ..database import get_db
from ..models.models import Attendance, User, PayrollSetting, TimeAdjustmentRequest
from ..schemas.attendance import (
    AttendanceCreate, 
    AttendanceUpdate, 
    AttendanceResponse, 
    AttendanceWithUser,
    MonthlyAttendanceStats,
    TimeAdjustmentRequestCreate,
    TimeAdjustmentRequestUpdate,
    TimeAdjustmentRequestResponse
)
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

# 自分の勤怠を登録する
@router.post("/check-in", response_model=AttendanceResponse)
async def check_in(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 同じ日にすでにチェックインしていないか確認
    today = datetime.now().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    existing_attendance = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.check_in_time >= today_start,
        Attendance.check_in_time <= today_end
    ).first()
    
    if existing_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="すでに本日の勤怠記録が存在します"
        )
    
    # 新しい勤怠記録を作成
    new_attendance = Attendance(
        user_id=current_user.id,
        check_in_time=attendance.check_in_time,
        check_out_time=attendance.check_out_time,
        break_start_time=attendance.break_start_time,
        break_end_time=attendance.break_end_time,
        memo=attendance.memo
    )
    
    # 退勤時間がある場合は勤務時間を計算
    if attendance.check_out_time:
        working_hours = calculate_working_hours(
            attendance.check_in_time,
            attendance.check_out_time,
            attendance.break_start_time,
            attendance.break_end_time
        )
        new_attendance.total_working_hours = working_hours["working_hours"]
        new_attendance.total_break_hours = working_hours["break_hours"]
    
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    
    return new_attendance

# チェックアウト（退勤）
@router.put("/check-out/{attendance_id}", response_model=AttendanceResponse)
async def check_out(
    attendance_id: int,
    update_data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 勤怠記録の取得と所有者の確認
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された勤怠記録が見つかりません"
        )
    
    if attendance.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この勤怠記録を更新する権限がありません"
        )
    
    # データの更新
    if update_data.check_out_time:
        attendance.check_out_time = update_data.check_out_time
    
    if update_data.break_start_time:
        attendance.break_start_time = update_data.break_start_time
    
    if update_data.break_end_time:
        attendance.break_end_time = update_data.break_end_time
    
    if update_data.memo:
        attendance.memo = update_data.memo
    
    # 勤務時間の計算
    if attendance.check_in_time and attendance.check_out_time:
        working_hours = calculate_working_hours(
            attendance.check_in_time,
            attendance.check_out_time,
            attendance.break_start_time,
            attendance.break_end_time
        )
        attendance.total_working_hours = working_hours["working_hours"]
        attendance.total_break_hours = working_hours["break_hours"]
    
    db.commit()
    db.refresh(attendance)
    
    return attendance

# 自分の勤怠記録を取得
@router.get("/my-records", response_model=List[AttendanceResponse])
async def get_my_attendance_records(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Attendance).filter(Attendance.user_id == current_user.id)
    
    # 日付範囲でフィルタリング
    if start_date:
        query = query.filter(Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()))
    
    if end_date:
        query = query.filter(Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time()))
    
    # 日付の降順でソート
    query = query.order_by(Attendance.check_in_time.desc())
    
    return query.all()

# 自分の月間勤怠記録を取得
@router.get("/my-monthly-records", response_model=List[AttendanceResponse])
async def get_my_monthly_attendance_records(
    year: int = Query(..., description="年（例：2023）"),
    month: int = Query(..., description="月（1-12）"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 月の開始日と終了日を計算
    start_date = date(year, month, 1)
    _, last_day = calendar.monthrange(year, month)
    end_date = date(year, month, last_day)
    
    # 指定した月の勤怠記録を取得
    records = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()),
        Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time())
    ).order_by(Attendance.check_in_time).all()
    
    return records

# 管理者用：全ユーザーの勤怠記録を取得
@router.get("/all-records", response_model=List[AttendanceWithUser])
async def get_all_attendance_records(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 基本クエリ
    query = (
        db.query(
            Attendance,
            User.full_name.label("user_full_name")
        )
        .join(User, Attendance.user_id == User.id)
    )
    
    # フィルタリング
    if start_date:
        query = query.filter(Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()))
    
    if end_date:
        query = query.filter(Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time()))
    
    if user_id:
        query = query.filter(Attendance.user_id == user_id)
    
    # 日付の降順、ユーザーIDの昇順でソート
    query = query.order_by(Attendance.check_in_time.desc(), User.id)
    
    # 結果を整形
    result = []
    for record, user_full_name in query.all():
        attendance_dict = {
            **vars(record),
            "user_full_name": user_full_name
        }
        # SQLAlchemyの内部属性を削除
        if "_sa_instance_state" in attendance_dict:
            del attendance_dict["_sa_instance_state"]
        
        result.append(attendance_dict)
    
    return result

# 月間勤怠統計（給与計算を含む）
@router.get("/monthly-stats", response_model=MonthlyAttendanceStats)
async def get_monthly_attendance_stats(
    year: int = Query(..., description="年（例：2023）"),
    month: int = Query(..., description="月（1-12）"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 月の開始日と終了日を計算
    start_date = date(year, month, 1)
    _, last_day = calendar.monthrange(year, month)
    end_date = date(year, month, last_day)
    
    # 勤怠記録を取得
    records = db.query(Attendance).filter(
        Attendance.user_id == current_user.id,
        Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()),
        Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time()),
        Attendance.check_out_time.isnot(None)  # 退勤済みの記録のみ
    ).all()
    
    # 給与計算設定を取得
    payroll_setting = db.query(PayrollSetting).first()
    if not payroll_setting:
        payroll_setting = PayrollSetting()
    
    # 統計の計算
    total_days = len(records)
    total_hours = sum(record.total_working_hours or 0 for record in records)
    
    # 残業時間の計算
    regular_hours = total_days * payroll_setting.regular_hours_per_day
    overtime_hours = max(0, total_hours - regular_hours)
    
    # 給与の計算
    hourly_rate = getattr(current_user, 'hourly_rate', 1000)  # デフォルト値として1000円を設定
    regular_pay = regular_hours * hourly_rate
    overtime_pay = overtime_hours * hourly_rate * payroll_setting.overtime_rate
    total_salary = regular_pay + overtime_pay
    
    return {
        "user_id": current_user.id,
        "user_full_name": current_user.full_name,
        "total_days_worked": total_days,
        "total_working_hours": total_hours,
        "total_overtime_hours": overtime_hours,
        "estimated_salary": total_salary
    }

# ユーティリティ関数：勤務時間の計算
def calculate_working_hours(check_in, check_out, break_start=None, break_end=None):
    # 総勤務時間（秒）
    total_seconds = (check_out - check_in).total_seconds()
    
    # 休憩時間（秒）
    break_seconds = 0
    if break_start and break_end:
        break_seconds = (break_end - break_start).total_seconds()
    
    # 実労働時間（秒）
    working_seconds = total_seconds - break_seconds
    
    # 時間単位に変換（小数点以下2桁まで）
    working_hours = round(working_seconds / 3600, 2)
    break_hours = round(break_seconds / 3600, 2)
    
    return {
        "working_hours": working_hours,
        "break_hours": break_hours
    }

# 打刻修正申請の作成
@router.post("/adjustment-request", response_model=TimeAdjustmentRequestResponse)
async def create_adjustment_request(
    request_data: TimeAdjustmentRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 勤怠記録を取得（存在する場合）
    attendance = None
    if request_data.attendance_id:
        attendance = db.query(Attendance).filter(Attendance.id == request_data.attendance_id).first()
        if not attendance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された勤怠記録が見つかりません"
            )
        
        if attendance.user_id != current_user.id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="この勤怠記録に対する修正申請を行う権限がありません"
            )
    
    # 修正申請の作成
    adjustment_request = TimeAdjustmentRequest(
        user_id=current_user.id,
        attendance_id=request_data.attendance_id,
        request_date=request_data.request_date,
        requested_check_in=request_data.requested_check_in,
        requested_check_out=request_data.requested_check_out,
        requested_break_start=request_data.requested_break_start,
        requested_break_end=request_data.requested_break_end,
        reason=request_data.reason,
        status="pending"
    )
    
    # 既存の勤怠記録がある場合は元の情報を保存
    if attendance:
        adjustment_request.original_check_in = attendance.check_in_time
        adjustment_request.original_check_out = attendance.check_out_time
        adjustment_request.original_break_start = attendance.break_start_time
        adjustment_request.original_break_end = attendance.break_end_time
    
    db.add(adjustment_request)
    db.commit()
    db.refresh(adjustment_request)
    
    return adjustment_request

# 自分の打刻修正申請一覧を取得
@router.get("/my-adjustment-requests", response_model=List[TimeAdjustmentRequestResponse])
async def get_my_adjustment_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(TimeAdjustmentRequest).filter(TimeAdjustmentRequest.user_id == current_user.id)
    
    if status:
        query = query.filter(TimeAdjustmentRequest.status == status)
    
    # 日付の降順でソート
    query = query.order_by(TimeAdjustmentRequest.created_at.desc())
    
    return query.all()

# 管理者用：打刻修正申請の一覧取得
@router.get("/admin/adjustment-requests", response_model=List[TimeAdjustmentRequestResponse])
async def get_all_adjustment_requests(
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(TimeAdjustmentRequest)
    
    if status:
        query = query.filter(TimeAdjustmentRequest.status == status)
    
    if user_id:
        query = query.filter(TimeAdjustmentRequest.user_id == user_id)
    
    # 日付の降順でソート
    query = query.order_by(TimeAdjustmentRequest.created_at.desc())
    
    return query.all()

# 管理者用：打刻修正申請の承認/拒否
@router.put("/admin/adjustment-requests/{request_id}", response_model=TimeAdjustmentRequestResponse)
async def update_adjustment_request(
    request_id: int,
    update_data: TimeAdjustmentRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 修正申請の取得
    adjustment_request = db.query(TimeAdjustmentRequest).filter(
        TimeAdjustmentRequest.id == request_id
    ).first()
    
    if not adjustment_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された修正申請が見つかりません"
        )
    
    # 申請のステータスを更新
    adjustment_request.status = update_data.status
    adjustment_request.admin_comment = update_data.admin_comment
    adjustment_request.admin_id = current_user.id
    adjustment_request.updated_at = datetime.now()
    
    # 承認の場合、勤怠記録を更新
    if update_data.status == "approved" and adjustment_request.attendance_id:
        attendance = db.query(Attendance).filter(
            Attendance.id == adjustment_request.attendance_id
        ).first()
        
        if attendance:
            # 申請された値で更新
            if adjustment_request.requested_check_in:
                attendance.check_in_time = adjustment_request.requested_check_in
            
            if adjustment_request.requested_check_out:
                attendance.check_out_time = adjustment_request.requested_check_out
            
            if adjustment_request.requested_break_start:
                attendance.break_start_time = adjustment_request.requested_break_start
            
            if adjustment_request.requested_break_end:
                attendance.break_end_time = adjustment_request.requested_break_end
            
            # 勤務時間を再計算
            if attendance.check_in_time and attendance.check_out_time:
                working_hours = calculate_working_hours(
                    attendance.check_in_time,
                    attendance.check_out_time,
                    attendance.break_start_time,
                    attendance.break_end_time
                )
                attendance.total_working_hours = working_hours["working_hours"]
                attendance.total_break_hours = working_hours["break_hours"]
    
    db.commit()
    db.refresh(adjustment_request)
    
    return adjustment_request 