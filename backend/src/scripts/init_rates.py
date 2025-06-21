"""
保険料率と所得税率の初期データを投入するスクリプト
"""
import sys
import os
from datetime import date
from sqlalchemy.orm import Session

# プロジェクトのルートディレクトリをパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.database import SessionLocal, engine
from src.models.models import InsuranceRate, IncomeTaxRate, PayrollSetting


def init_insurance_rates(db: Session):
    """保険料率の初期データを投入"""
    
    # 健康保険料（東京都の例）
    health_insurance = InsuranceRate(
        rate_type="health",
        rate_name="健康保険料（協会けんぽ・東京都）",
        prefecture="東京都",
        rate=0.1000,  # 10.00%
        employee_rate=0.0500,  # 従業員負担 5.00%
        employer_rate=0.0500,  # 会社負担 5.00%
        effective_date=date(2024, 4, 1),
        notes="令和6年度 協会けんぽ東京都"
    )
    db.add(health_insurance)
    
    # 厚生年金保険料（全国一律）
    pension = InsuranceRate(
        rate_type="pension",
        rate_name="厚生年金保険料",
        rate=0.1830,  # 18.30%
        employee_rate=0.0915,  # 従業員負担 9.15%
        employer_rate=0.0915,  # 会社負担 9.15%
        effective_date=date(2017, 9, 1),
        notes="平成29年9月以降固定"
    )
    db.add(pension)
    
    # 雇用保険料（一般の事業）
    employment_general = InsuranceRate(
        rate_type="employment",
        rate_name="雇用保険料（一般の事業）",
        industry_type="一般",
        rate=0.0095,  # 0.95%
        employee_rate=0.0030,  # 従業員負担 0.3%
        employer_rate=0.0065,  # 会社負担 0.65%
        effective_date=date(2024, 4, 1),
        notes="令和6年度 一般の事業"
    )
    db.add(employment_general)
    
    # 雇用保険料（建設業）
    employment_construction = InsuranceRate(
        rate_type="employment",
        rate_name="雇用保険料（建設業）",
        industry_type="建設",
        rate=0.0115,  # 1.15%
        employee_rate=0.0040,  # 従業員負担 0.4%
        employer_rate=0.0075,  # 会社負担 0.75%
        effective_date=date(2024, 4, 1),
        notes="令和6年度 建設業"
    )
    db.add(employment_construction)
    
    db.commit()
    print("保険料率の初期データを投入しました")


def init_income_tax_rates(db: Session):
    """所得税率の初期データを投入（月額表・扶養0人）"""
    
    tax_rates = [
        # 月額表・扶養0人の場合
        {"min": 0, "max": 87999, "rate": 0.0, "deduction": 0},
        {"min": 88000, "max": 88999, "rate": 0.0021, "deduction": 0},
        {"min": 89000, "max": 89999, "rate": 0.0024, "deduction": 0},
        {"min": 90000, "max": 93999, "rate": 0.0027, "deduction": 0},
        {"min": 94000, "max": 100999, "rate": 0.0030, "deduction": 0},
        {"min": 101000, "max": 120999, "rate": 0.0033, "deduction": 0},
        {"min": 121000, "max": 161999, "rate": 0.0505, "deduction": 2110},
        {"min": 162000, "max": 254999, "rate": 0.0707, "deduction": 5412},
        {"min": 255000, "max": 274999, "rate": 0.1010, "deduction": 13126},
        {"min": 275000, "max": 578999, "rate": 0.1212, "deduction": 18681},
        {"min": 579000, "max": 749999, "rate": 0.2323, "deduction": 83041},
        {"min": 750000, "max": 1499999, "rate": 0.3333, "deduction": 158616},
        {"min": 1500000, "max": None, "rate": 0.4545, "deduction": 341426},
    ]
    
    for rate_data in tax_rates:
        tax_rate = IncomeTaxRate(
            min_amount=rate_data["min"],
            max_amount=rate_data["max"],
            rate=rate_data["rate"],
            deduction=rate_data["deduction"],
            withholding_type="monthly",
            dependent_count=0,
            effective_date=date(2024, 1, 1),
        )
        db.add(tax_rate)
    
    db.commit()
    print("所得税率の初期データを投入しました")


def update_payroll_settings(db: Session):
    """給与設定を更新してDB料率を使用するように設定"""
    
    setting = db.query(PayrollSetting).first()
    if not setting:
        setting = PayrollSetting()
        db.add(setting)
    
    setting.use_db_rates = True
    setting.default_prefecture = "東京都"
    setting.default_industry = "一般"
    
    db.commit()
    print("給与設定を更新しました")


def main():
    """メイン処理"""
    db = SessionLocal()
    
    try:
        # 既存のデータをチェック
        existing_insurance = db.query(InsuranceRate).count()
        existing_tax = db.query(IncomeTaxRate).count()
        
        if existing_insurance == 0:
            init_insurance_rates(db)
        else:
            print(f"保険料率データは既に{existing_insurance}件存在します")
        
        if existing_tax == 0:
            init_income_tax_rates(db)
        else:
            print(f"所得税率データは既に{existing_tax}件存在します")
        
        update_payroll_settings(db)
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()