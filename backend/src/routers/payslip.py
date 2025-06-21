from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
import calendar

from ..database import get_db
from ..models.models import User, Attendance, PayrollSetting, Payslip, PayslipDetail, Holiday
from ..schemas.payslip import (
    PayslipCreate,
    PayslipUpdate,
    PayslipResponse,
    PayslipListResponse,
    PayslipCalculateRequest,
    PayslipCalculateResponse,
    PayslipConfirmRequest,
    PayslipPaymentRequest,
    PayslipDetailCreate
)
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/payslips", tags=["payslips"])

# 自分の給与明細一覧取得
@router.get("/my-payslips", response_model=PayslipListResponse)
async def get_my_payslips(
    year: Optional[int] = Query(None, description="年"),
    status: Optional[str] = Query(None, description="ステータス"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Payslip).filter(Payslip.user_id == current_user.id)
    
    if year:
        query = query.filter(Payslip.year == year)
    
    if status:
        query = query.filter(Payslip.status == status)
    
    query = query.order_by(Payslip.year.desc(), Payslip.month.desc())
    
    payslips = query.all()
    
    # ユーザー情報を追加
    for payslip in payslips:
        payslip.user_name = current_user.full_name
        payslip.employee_code = current_user.employee_code
        payslip.department_name = current_user.department.name if current_user.department else None
    
    return PayslipListResponse(items=payslips, total=len(payslips))

# 特定の給与明細取得
@router.get("/my-payslips/{year}/{month}", response_model=PayslipResponse)
async def get_my_payslip(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    payslip = db.query(Payslip).options(joinedload(Payslip.details)).filter(
        Payslip.user_id == current_user.id,
        Payslip.year == year,
        Payslip.month == month
    ).first()
    
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された給与明細が見つかりません"
        )
    
    # ユーザー情報を追加
    payslip.user_name = current_user.full_name
    payslip.employee_code = current_user.employee_code
    payslip.department_name = current_user.department.name if current_user.department else None
    
    return payslip

# 管理者用：全従業員の給与明細一覧
@router.get("/admin", response_model=PayslipListResponse)
async def get_all_payslips(
    year: Optional[int] = Query(None, description="年"),
    month: Optional[int] = Query(None, description="月"),
    user_id: Optional[int] = Query(None, description="ユーザーID"),
    status: Optional[str] = Query(None, description="ステータス"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(Payslip).options(joinedload(Payslip.user))
    
    if year:
        query = query.filter(Payslip.year == year)
    
    if month:
        query = query.filter(Payslip.month == month)
    
    if user_id:
        query = query.filter(Payslip.user_id == user_id)
    
    if status:
        query = query.filter(Payslip.status == status)
    
    query = query.order_by(Payslip.year.desc(), Payslip.month.desc(), Payslip.user_id)
    
    payslips = query.all()
    
    # ユーザー情報を追加
    for payslip in payslips:
        user = payslip.user
        payslip.user_name = user.full_name
        payslip.employee_code = user.employee_code
        payslip.department_name = user.department.name if user.department else None
    
    return PayslipListResponse(items=payslips, total=len(payslips))

# 給与計算実行（管理者のみ）
@router.post("/admin/calculate", response_model=PayslipCalculateResponse)
async def calculate_payslips(
    request: PayslipCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    created_count = 0
    updated_count = 0
    error_count = 0
    errors = []
    
    # 対象ユーザーの取得
    if request.user_ids:
        users = db.query(User).filter(User.id.in_(request.user_ids)).all()
    else:
        users = db.query(User).filter(User.is_active == True).all()
    
    # 給与計算設定を取得
    payroll_setting = db.query(PayrollSetting).first()
    if not payroll_setting:
        payroll_setting = PayrollSetting()
    
    # 月の開始日と終了日を計算
    start_date = date(request.year, request.month, 1)
    _, last_day = calendar.monthrange(request.year, request.month)
    end_date = date(request.year, request.month, last_day)
    
    # 休日情報を取得
    holidays = db.query(Holiday).filter(
        Holiday.date >= start_date,
        Holiday.date <= end_date
    ).all()
    holiday_dates = {h.date for h in holidays}
    
    for user in users:
        try:
            # 既存の給与明細をチェック
            existing_payslip = db.query(Payslip).filter(
                Payslip.user_id == user.id,
                Payslip.year == request.year,
                Payslip.month == request.month
            ).first()
            
            # 勤怠記録を取得
            attendances = db.query(Attendance).filter(
                Attendance.user_id == user.id,
                Attendance.check_in_time >= datetime.combine(start_date, datetime.min.time()),
                Attendance.check_in_time <= datetime.combine(end_date, datetime.max.time()),
                Attendance.check_out_time.isnot(None)
            ).all()
            
            # 勤怠情報の集計
            work_days = len(attendances)
            total_hours = sum(a.total_working_hours or 0 for a in attendances)
            
            # 各種勤務時間の計算
            regular_hours = 0
            overtime_hours = 0
            late_night_hours = 0
            holiday_hours = 0
            
            for attendance in attendances:
                if not attendance.total_working_hours:
                    continue
                
                # 曜日と休日チェック
                attendance_date = attendance.check_in_time.date()
                is_holiday = attendance_date in holiday_dates or attendance_date.weekday() >= 5  # 土日
                
                if is_holiday:
                    holiday_hours += attendance.total_working_hours
                else:
                    # 通常勤務時間と残業時間の計算
                    daily_regular = min(attendance.total_working_hours, payroll_setting.regular_hours_per_day)
                    daily_overtime = max(0, attendance.total_working_hours - payroll_setting.regular_hours_per_day)
                    
                    regular_hours += daily_regular
                    overtime_hours += daily_overtime
                
                # 深夜勤務時間の計算（22:00-5:00）
                check_in = attendance.check_in_time
                check_out = attendance.check_out_time
                
                # 簡易的な深夜時間計算（改善の余地あり）
                if check_in.hour >= 22 or check_out.hour <= 5:
                    # 詳細な計算は省略、概算で計算
                    late_night_hours += min(attendance.total_working_hours * 0.3, 7)  # 最大7時間
            
            # 給与計算
            hourly_rate = user.hourly_rate or 1000
            base_salary = int(regular_hours * hourly_rate)
            overtime_pay = int(overtime_hours * hourly_rate * payroll_setting.overtime_rate)
            late_night_pay = int(late_night_hours * hourly_rate * (payroll_setting.night_shift_rate - 1))
            holiday_pay = int(holiday_hours * hourly_rate * payroll_setting.holiday_rate)
            gross_salary = base_salary + overtime_pay + late_night_pay + holiday_pay
            
            # 簡易的な控除計算（実際の計算は複雑）
            if user.monthly_salary:
                # 月給制の場合
                health_insurance = int(user.monthly_salary * 0.05)  # 健康保険料（約5%）
                pension = int(user.monthly_salary * 0.0915)  # 厚生年金（約9.15%）
                employment_insurance = int(user.monthly_salary * 0.003)  # 雇用保険（約0.3%）
            else:
                # 時給制の場合
                health_insurance = int(gross_salary * 0.05)
                pension = int(gross_salary * 0.0915)
                employment_insurance = int(gross_salary * 0.003)
            
            # 所得税の簡易計算
            taxable_income = gross_salary - health_insurance - pension - employment_insurance
            if taxable_income > 195000:
                income_tax = int(taxable_income * 0.05)
            else:
                income_tax = 0
            
            total_deductions = health_insurance + pension + employment_insurance + income_tax
            net_salary = gross_salary - total_deductions
            
            if existing_payslip:
                # 更新（draft状態の場合のみ）
                if existing_payslip.status == "draft":
                    existing_payslip.work_days = work_days
                    existing_payslip.total_hours = total_hours
                    existing_payslip.regular_hours = regular_hours
                    existing_payslip.overtime_hours = overtime_hours
                    existing_payslip.late_night_hours = late_night_hours
                    existing_payslip.holiday_hours = holiday_hours
                    existing_payslip.base_salary = base_salary
                    existing_payslip.overtime_pay = overtime_pay
                    existing_payslip.late_night_pay = late_night_pay
                    existing_payslip.holiday_pay = holiday_pay
                    existing_payslip.gross_salary = gross_salary
                    existing_payslip.health_insurance = health_insurance
                    existing_payslip.pension = pension
                    existing_payslip.employment_insurance = employment_insurance
                    existing_payslip.income_tax = income_tax
                    existing_payslip.total_deductions = total_deductions
                    existing_payslip.net_salary = net_salary
                    existing_payslip.updated_at = datetime.now()
                    
                    updated_count += 1
            else:
                # 新規作成
                new_payslip = Payslip(
                    user_id=user.id,
                    year=request.year,
                    month=request.month,
                    work_days=work_days,
                    total_hours=total_hours,
                    regular_hours=regular_hours,
                    overtime_hours=overtime_hours,
                    late_night_hours=late_night_hours,
                    holiday_hours=holiday_hours,
                    base_salary=base_salary,
                    overtime_pay=overtime_pay,
                    late_night_pay=late_night_pay,
                    holiday_pay=holiday_pay,
                    gross_salary=gross_salary,
                    health_insurance=health_insurance,
                    pension=pension,
                    employment_insurance=employment_insurance,
                    income_tax=income_tax,
                    total_deductions=total_deductions,
                    net_salary=net_salary
                )
                db.add(new_payslip)
                created_count += 1
                
        except Exception as e:
            error_count += 1
            errors.append({
                "user_id": user.id,
                "user_name": user.full_name,
                "error": str(e)
            })
    
    db.commit()
    
    return PayslipCalculateResponse(
        created_count=created_count,
        updated_count=updated_count,
        error_count=error_count,
        errors=errors
    )

# 給与明細の更新（管理者のみ）
@router.put("/{payslip_id}", response_model=PayslipResponse)
async def update_payslip(
    payslip_id: int,
    update_data: PayslipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    payslip = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="給与明細が見つかりません"
        )
    
    if payslip.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="確定済みの給与明細は編集できません"
        )
    
    # 更新
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            setattr(payslip, field, value)
    
    # 控除合計と手取り額の再計算
    payslip.total_deductions = (
        payslip.health_insurance +
        payslip.pension +
        payslip.employment_insurance +
        payslip.income_tax +
        payslip.resident_tax +
        payslip.other_deductions
    )
    payslip.net_salary = payslip.gross_salary - payslip.total_deductions
    payslip.updated_at = datetime.now()
    
    db.commit()
    db.refresh(payslip)
    
    # ユーザー情報を追加
    user = payslip.user
    payslip.user_name = user.full_name
    payslip.employee_code = user.employee_code
    payslip.department_name = user.department.name if user.department else None
    
    return payslip

# 給与明細の確定（管理者のみ）
@router.post("/admin/confirm")
async def confirm_payslips(
    request: PayslipConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    confirmed_count = 0
    
    for payslip_id in request.payslip_ids:
        payslip = db.query(Payslip).filter(Payslip.id == payslip_id).first()
        
        if payslip and payslip.status == "draft":
            payslip.status = "confirmed"
            payslip.confirmed_at = datetime.now()
            payslip.confirmed_by = current_user.id
            confirmed_count += 1
    
    db.commit()
    
    return {"confirmed_count": confirmed_count}

# 給与支払い記録（管理者のみ）
@router.post("/admin/payment")
async def record_payment(
    request: PayslipPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    paid_count = 0
    
    for payslip_id in request.payslip_ids:
        payslip = db.query(Payslip).filter(Payslip.id == payslip_id).first()
        
        if payslip and payslip.status == "confirmed":
            payslip.status = "paid"
            payslip.paid_at = datetime.combine(request.payment_date, datetime.min.time())
            paid_count += 1
    
    db.commit()
    
    return {"paid_count": paid_count}