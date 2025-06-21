from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import date

from ..database import get_db
from ..models.models import InsuranceRate, IncomeTaxRate, User
from ..schemas.insurance_rate import (
    InsuranceRateCreate,
    InsuranceRateUpdate,
    InsuranceRateResponse,
    IncomeTaxRateCreate,
    IncomeTaxRateUpdate,
    IncomeTaxRateResponse
)
from ..auth.auth import get_current_admin_user

router = APIRouter(prefix="/api/insurance-rates", tags=["insurance_rates"])


# 保険料率一覧取得（管理者のみ）
@router.get("/", response_model=List[InsuranceRateResponse])
async def get_insurance_rates(
    rate_type: Optional[str] = Query(None, description="料率タイプでフィルタ"),
    prefecture: Optional[str] = Query(None, description="都道府県でフィルタ"),
    active_only: bool = Query(True, description="有効な料率のみ表示"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(InsuranceRate)
    
    if rate_type:
        query = query.filter(InsuranceRate.rate_type == rate_type)
    
    if prefecture:
        query = query.filter(InsuranceRate.prefecture == prefecture)
    
    if active_only:
        today = date.today()
        query = query.filter(
            and_(
                InsuranceRate.effective_date <= today,
                or_(
                    InsuranceRate.expiry_date.is_(None),
                    InsuranceRate.expiry_date >= today
                )
            )
        )
    
    return query.order_by(InsuranceRate.rate_type, InsuranceRate.effective_date.desc()).all()


# 保険料率作成（管理者のみ）
@router.post("/", response_model=InsuranceRateResponse)
async def create_insurance_rate(
    rate_data: InsuranceRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # 同じタイプ・地域・業種で期間が重複する料率がないかチェック
    existing = db.query(InsuranceRate).filter(
        InsuranceRate.rate_type == rate_data.rate_type,
        InsuranceRate.prefecture == rate_data.prefecture,
        InsuranceRate.industry_type == rate_data.industry_type,
        or_(
            InsuranceRate.expiry_date.is_(None),
            InsuranceRate.expiry_date >= rate_data.effective_date
        )
    ).first()
    
    if existing:
        # 既存の料率の終了日を設定
        if not existing.expiry_date or existing.expiry_date >= rate_data.effective_date:
            existing.expiry_date = rate_data.effective_date
            db.add(existing)
    
    new_rate = InsuranceRate(**rate_data.dict())
    db.add(new_rate)
    db.commit()
    db.refresh(new_rate)
    
    return new_rate


# 保険料率更新（管理者のみ）
@router.put("/{rate_id}", response_model=InsuranceRateResponse)
async def update_insurance_rate(
    rate_id: int,
    rate_data: InsuranceRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    rate = db.query(InsuranceRate).filter(InsuranceRate.id == rate_id).first()
    
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="保険料率が見つかりません"
        )
    
    update_dict = rate_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(rate, field, value)
    
    db.commit()
    db.refresh(rate)
    
    return rate


# 保険料率削除（管理者のみ）
@router.delete("/{rate_id}")
async def delete_insurance_rate(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    rate = db.query(InsuranceRate).filter(InsuranceRate.id == rate_id).first()
    
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="保険料率が見つかりません"
        )
    
    db.delete(rate)
    db.commit()
    
    return {"message": "保険料率を削除しました"}


# 所得税率一覧取得（管理者のみ）
@router.get("/income-tax", response_model=List[IncomeTaxRateResponse])
async def get_income_tax_rates(
    withholding_type: Optional[str] = Query("monthly", description="源泉徴収タイプ"),
    dependent_count: Optional[int] = Query(0, description="扶養人数"),
    active_only: bool = Query(True, description="有効な税率のみ表示"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    query = db.query(IncomeTaxRate)
    
    if withholding_type:
        query = query.filter(IncomeTaxRate.withholding_type == withholding_type)
    
    if dependent_count is not None:
        query = query.filter(IncomeTaxRate.dependent_count == dependent_count)
    
    if active_only:
        today = date.today()
        query = query.filter(
            and_(
                IncomeTaxRate.effective_date <= today,
                or_(
                    IncomeTaxRate.expiry_date.is_(None),
                    IncomeTaxRate.expiry_date >= today
                )
            )
        )
    
    return query.order_by(IncomeTaxRate.min_amount).all()


# 所得税率作成（管理者のみ）
@router.post("/income-tax", response_model=IncomeTaxRateResponse)
async def create_income_tax_rate(
    rate_data: IncomeTaxRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    new_rate = IncomeTaxRate(**rate_data.dict())
    db.add(new_rate)
    db.commit()
    db.refresh(new_rate)
    
    return new_rate


# 所得税率更新（管理者のみ）
@router.put("/income-tax/{rate_id}", response_model=IncomeTaxRateResponse)
async def update_income_tax_rate(
    rate_id: int,
    rate_data: IncomeTaxRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    rate = db.query(IncomeTaxRate).filter(IncomeTaxRate.id == rate_id).first()
    
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="所得税率が見つかりません"
        )
    
    update_dict = rate_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(rate, field, value)
    
    db.commit()
    db.refresh(rate)
    
    return rate


# 所得税率削除（管理者のみ）
@router.delete("/income-tax/{rate_id}")
async def delete_income_tax_rate(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    rate = db.query(IncomeTaxRate).filter(IncomeTaxRate.id == rate_id).first()
    
    if not rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="所得税率が見つかりません"
        )
    
    db.delete(rate)
    db.commit()
    
    return {"message": "所得税率を削除しました"}


# 現在有効な料率を取得する関数（給与計算で使用）
def get_active_insurance_rate(
    db: Session,
    rate_type: str,
    prefecture: Optional[str] = None,
    industry_type: Optional[str] = None,
    target_date: Optional[date] = None
) -> Optional[InsuranceRate]:
    if not target_date:
        target_date = date.today()
    
    query = db.query(InsuranceRate).filter(
        InsuranceRate.rate_type == rate_type,
        InsuranceRate.effective_date <= target_date,
        or_(
            InsuranceRate.expiry_date.is_(None),
            InsuranceRate.expiry_date >= target_date
        )
    )
    
    if prefecture and rate_type == "health":
        query = query.filter(InsuranceRate.prefecture == prefecture)
    
    if industry_type and rate_type == "employment":
        query = query.filter(InsuranceRate.industry_type == industry_type)
    
    return query.order_by(InsuranceRate.effective_date.desc()).first()


# 現在有効な所得税率を取得する関数（給与計算で使用）
def get_income_tax_rate(
    db: Session,
    taxable_amount: int,
    withholding_type: str = "monthly",
    dependent_count: int = 0,
    target_date: Optional[date] = None
) -> Optional[IncomeTaxRate]:
    if not target_date:
        target_date = date.today()
    
    return db.query(IncomeTaxRate).filter(
        IncomeTaxRate.withholding_type == withholding_type,
        IncomeTaxRate.dependent_count == dependent_count,
        IncomeTaxRate.min_amount <= taxable_amount,
        or_(
            IncomeTaxRate.max_amount.is_(None),
            IncomeTaxRate.max_amount >= taxable_amount
        ),
        IncomeTaxRate.effective_date <= target_date,
        or_(
            IncomeTaxRate.expiry_date.is_(None),
            IncomeTaxRate.expiry_date >= target_date
        )
    ).first()