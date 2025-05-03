from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import calendar

from ..database import get_db
from ..models.models import Report, User
from ..schemas.report import ReportCreate, ReportUpdate, ReportResponse, ReportWithUser
from ..auth.auth import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

# 日報の作成
@router.post("", response_model=ReportResponse)
async def create_report(
    report: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 同じ日の日報が既に存在するか確認
    existing_report = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.report_date == report.report_date
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="この日の日報は既に提出されています"
        )
    
    # 新しい日報を作成
    new_report = Report(
        user_id=current_user.id,
        report_date=report.report_date,
        content=report.content,
        tasks_completed=report.tasks_completed,
        tasks_planned=report.tasks_planned,
        issues=report.issues
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    return new_report

# 日報の更新
@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_data: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 日報を取得
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された日報が見つかりません"
        )
    
    # 所有者または管理者のみ更新可能
    if report.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この日報を更新する権限がありません"
        )
    
    # データの更新
    if report_data.content is not None:
        report.content = report_data.content
    
    if report_data.tasks_completed is not None:
        report.tasks_completed = report_data.tasks_completed
    
    if report_data.tasks_planned is not None:
        report.tasks_planned = report_data.tasks_planned
    
    if report_data.issues is not None:
        report.issues = report_data.issues
    
    report.updated_at = datetime.now()
    
    db.commit()
    db.refresh(report)
    
    return report

# 自分の日報一覧を取得
@router.get("/my-reports", response_model=List[ReportResponse])
async def get_my_reports(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Report).filter(Report.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Report.report_date >= start_date)
    
    if end_date:
        query = query.filter(Report.report_date <= end_date)
    
    # 日付の降順でソート
    query = query.order_by(Report.report_date.desc())
    
    return query.all()

# 特定の日の日報を取得
@router.get("/date/{report_date}", response_model=ReportResponse)
async def get_report_by_date(
    report_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.report_date == report_date
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された日の日報が見つかりません"
        )
    
    return report

# 管理者用：全ユーザーの日報を取得
@router.get("/admin/all-reports", response_model=List[ReportWithUser])
async def get_all_reports(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 基本クエリ
    query = (
        db.query(
            Report,
            User.full_name.label("user_full_name")
        )
        .join(User, Report.user_id == User.id)
    )
    
    # フィルタリング
    if start_date:
        query = query.filter(Report.report_date >= start_date)
    
    if end_date:
        query = query.filter(Report.report_date <= end_date)
    
    if user_id:
        query = query.filter(Report.user_id == user_id)
    
    # 日付の降順、ユーザーIDの昇順でソート
    query = query.order_by(Report.report_date.desc(), User.id)
    
    # 結果を整形
    result = []
    for report, user_full_name in query.all():
        report_dict = {
            **vars(report),
            "user_full_name": user_full_name
        }
        # SQLAlchemyの内部属性を削除
        if "_sa_instance_state" in report_dict:
            del report_dict["_sa_instance_state"]
        
        result.append(report_dict)
    
    return result

# 管理者用：特定ユーザーの日報一覧を取得
@router.get("/admin/user/{user_id}", response_model=List[ReportWithUser])
async def get_user_reports(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # ユーザーの存在確認
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません"
        )
    
    # 基本クエリ
    query = (
        db.query(
            Report,
            User.full_name.label("user_full_name")
        )
        .join(User, Report.user_id == User.id)
        .filter(Report.user_id == user_id)
    )
    
    # フィルタリング
    if start_date:
        query = query.filter(Report.report_date >= start_date)
    
    if end_date:
        query = query.filter(Report.report_date <= end_date)
    
    # 日付の降順でソート
    query = query.order_by(Report.report_date.desc())
    
    # 結果を整形
    result = []
    for report, user_full_name in query.all():
        report_dict = {
            **vars(report),
            "user_full_name": user_full_name
        }
        # SQLAlchemyの内部属性を削除
        if "_sa_instance_state" in report_dict:
            del report_dict["_sa_instance_state"]
        
        result.append(report_dict)
    
    return result 