from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional, Dict
from datetime import datetime, date, timedelta
import calendar
import csv
import io
from io import StringIO
import json

from ..database import get_db
from ..models.models import User, Attendance, PayrollSetting
from ..schemas.attendance import MonthlyAttendanceStats
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/payroll", tags=["payroll"])

# 給与明細を取得する（ユーザー自身）
@router.get("/my-payslip", response_model=MonthlyAttendanceStats)
async def get_my_payslip(
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
    hourly_rate = current_user.hourly_rate
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

# CSVで給与明細をダウンロードする（ユーザー自身）
@router.get("/my-payslip/download")
async def download_my_payslip(
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
    ).order_by(Attendance.check_in_time).all()
    
    # 給与計算設定を取得
    payroll_setting = db.query(PayrollSetting).first()
    if not payroll_setting:
        payroll_setting = PayrollSetting()
    
    # CSV出力用のバッファを準備
    output = StringIO()
    writer = csv.writer(output)
    
    # ヘッダー行
    writer.writerow([f"{year}年{month}月 給与明細"])
    writer.writerow([])
    writer.writerow(["従業員名", current_user.full_name])
    writer.writerow(["従業員ID", current_user.id])
    writer.writerow(["時給", current_user.hourly_rate])
    writer.writerow([])
    
    # 勤務日ごとの詳細
    writer.writerow(["日付", "出勤時間", "退勤時間", "休憩時間(時間)", "勤務時間(時間)", "メモ"])
    total_hours = 0
    
    for record in records:
        check_in_date = record.check_in_time.strftime("%Y-%m-%d")
        check_in_time = record.check_in_time.strftime("%H:%M")
        check_out_time = record.check_out_time.strftime("%H:%M") if record.check_out_time else "-"
        break_hours = record.total_break_hours or 0
        working_hours = record.total_working_hours or 0
        
        writer.writerow([
            check_in_date,
            check_in_time,
            check_out_time,
            f"{break_hours:.2f}",
            f"{working_hours:.2f}",
            record.memo or ""
        ])
        
        total_hours += working_hours
    
    writer.writerow([])
    
    # 残業時間の計算
    total_days = len(records)
    regular_hours = total_days * payroll_setting.regular_hours_per_day
    overtime_hours = max(0, total_hours - regular_hours)
    
    # 給与の計算
    hourly_rate = current_user.hourly_rate
    regular_pay = regular_hours * hourly_rate
    overtime_pay = overtime_hours * hourly_rate * payroll_setting.overtime_rate
    total_salary = regular_pay + overtime_pay
    
    # 合計情報
    writer.writerow(["合計勤務日数", total_days])
    writer.writerow(["合計勤務時間", f"{total_hours:.2f}"])
    writer.writerow(["基本勤務時間", f"{regular_hours:.2f}"])
    writer.writerow(["残業時間", f"{overtime_hours:.2f}"])
    writer.writerow([])
    writer.writerow(["基本給", f"{regular_pay:.0f}"])
    writer.writerow(["残業手当", f"{overtime_pay:.0f}"])
    writer.writerow(["合計支給額", f"{total_salary:.0f}"])
    
    # レスポンスの準備
    output.seek(0)
    headers = {
        'Content-Disposition': f'attachment; filename="payslip_{year}_{month}_{current_user.id}.csv"'
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

# 管理者用：全従業員の給与明細を取得
@router.get("/admin/payslips", response_model=List[MonthlyAttendanceStats])
async def get_all_payslips(
    year: int = Query(..., description="年（例：2023）"),
    month: int = Query(..., description="月（1-12）"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 月の開始日と終了日を計算
    start_date = date(year, month, 1)
    _, last_day = calendar.monthrange(year, month)
    end_date = date(year, month, last_day)
    
    # 給与計算設定を取得
    payroll_setting = db.query(PayrollSetting).first()
    if not payroll_setting:
        payroll_setting = PayrollSetting()
    
    # 全従業員の取得
    users = db.query(User).filter(User.is_active == True).all()
    
    results = []
    for user in users:
        # 勤怠記録を取得
        records = db.query(Attendance).filter(
            Attendance.user_id == user.id,
            Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()),
            Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time()),
            Attendance.check_out_time.isnot(None)  # 退勤済みの記録のみ
        ).all()
        
        # 統計の計算
        total_days = len(records)
        total_hours = sum(record.total_working_hours or 0 for record in records)
        
        # 残業時間の計算
        regular_hours = total_days * payroll_setting.regular_hours_per_day
        overtime_hours = max(0, total_hours - regular_hours)
        
        # 給与の計算
        hourly_rate = user.hourly_rate
        regular_pay = regular_hours * hourly_rate
        overtime_pay = overtime_hours * hourly_rate * payroll_setting.overtime_rate
        total_salary = regular_pay + overtime_pay
        
        results.append({
            "user_id": user.id,
            "user_full_name": user.full_name,
            "total_days_worked": total_days,
            "total_working_hours": total_hours,
            "total_overtime_hours": overtime_hours,
            "estimated_salary": total_salary
        })
    
    return results

# 管理者用：全従業員の給与明細をCSVでダウンロード
@router.get("/admin/payslips/download")
async def download_all_payslips(
    year: int = Query(..., description="年（例：2023）"),
    month: int = Query(..., description="月（1-12）"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 月の開始日と終了日を計算
    start_date = date(year, month, 1)
    _, last_day = calendar.monthrange(year, month)
    end_date = date(year, month, last_day)
    
    # 給与計算設定を取得
    payroll_setting = db.query(PayrollSetting).first()
    if not payroll_setting:
        payroll_setting = PayrollSetting()
    
    # CSV出力用のバッファを準備
    output = StringIO()
    writer = csv.writer(output)
    
    # ヘッダー行
    writer.writerow([f"{year}年{month}月 全従業員給与明細一覧"])
    writer.writerow([])
    writer.writerow(["従業員ID", "従業員名", "勤務日数", "勤務時間", "残業時間", "基本給", "残業手当", "合計支給額"])
    
    # 全従業員の取得
    users = db.query(User).filter(User.is_active == True).all()
    
    for user in users:
        # 勤怠記録を取得
        records = db.query(Attendance).filter(
            Attendance.user_id == user.id,
            Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()),
            Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time()),
            Attendance.check_out_time.isnot(None)  # 退勤済みの記録のみ
        ).all()
        
        # 統計の計算
        total_days = len(records)
        total_hours = sum(record.total_working_hours or 0 for record in records)
        
        # 残業時間の計算
        regular_hours = total_days * payroll_setting.regular_hours_per_day
        overtime_hours = max(0, total_hours - regular_hours)
        
        # 給与の計算
        hourly_rate = user.hourly_rate
        regular_pay = regular_hours * hourly_rate
        overtime_pay = overtime_hours * hourly_rate * payroll_setting.overtime_rate
        total_salary = regular_pay + overtime_pay
        
        writer.writerow([
            user.id,
            user.full_name,
            total_days,
            f"{total_hours:.2f}",
            f"{overtime_hours:.2f}",
            f"{regular_pay:.0f}",
            f"{overtime_pay:.0f}",
            f"{total_salary:.0f}"
        ])
    
    # レスポンスの準備
    output.seek(0)
    headers = {
        'Content-Disposition': f'attachment; filename="all_payslips_{year}_{month}.csv"'
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers) 