from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


# 保険料率のベーススキーマ
class InsuranceRateBase(BaseModel):
    rate_type: str = Field(..., description="料率タイプ（health, pension, employment）")
    rate_name: str = Field(..., description="表示名（例：健康保険料）")
    prefecture: Optional[str] = Field(None, description="都道府県（健康保険用）")
    industry_type: Optional[str] = Field(None, description="業種（雇用保険用）")
    rate: float = Field(..., description="料率（例: 0.05 = 5%）")
    employee_rate: Optional[float] = Field(None, description="従業員負担率")
    employer_rate: Optional[float] = Field(None, description="会社負担率")
    effective_date: date = Field(..., description="適用開始日")
    expiry_date: Optional[date] = Field(None, description="適用終了日")
    notes: Optional[str] = Field(None, description="備考")


class InsuranceRateCreate(InsuranceRateBase):
    pass


class InsuranceRateUpdate(BaseModel):
    rate_name: Optional[str] = None
    prefecture: Optional[str] = None
    industry_type: Optional[str] = None
    rate: Optional[float] = None
    employee_rate: Optional[float] = None
    employer_rate: Optional[float] = None
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class InsuranceRateResponse(InsuranceRateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# 所得税率のスキーマ
class IncomeTaxRateBase(BaseModel):
    min_amount: int = Field(..., description="下限金額")
    max_amount: Optional[int] = Field(None, description="上限金額（NULL=上限なし）")
    rate: float = Field(..., description="税率")
    deduction: int = Field(0, description="控除額")
    withholding_type: str = Field("monthly", description="源泉徴収タイプ（monthly, daily）")
    dependent_count: int = Field(0, description="扶養人数")
    effective_date: date = Field(..., description="適用開始日")
    expiry_date: Optional[date] = Field(None, description="適用終了日")


class IncomeTaxRateCreate(IncomeTaxRateBase):
    pass


class IncomeTaxRateUpdate(BaseModel):
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None
    rate: Optional[float] = None
    deduction: Optional[int] = None
    withholding_type: Optional[str] = None
    dependent_count: Optional[int] = None
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None


class IncomeTaxRateResponse(IncomeTaxRateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True