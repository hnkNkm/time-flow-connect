from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 環境変数からデータベースURLを取得
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5433/timeflowconnect")

# SQLAlchemyエンジンを作成
engine = create_engine(DATABASE_URL)

# セッションローカルを作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# モデル定義用のベースクラス
Base = declarative_base()

# DBセッションの依存関係
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# データベース初期化関数
def init_db():
    """データベーステーブルの初期化"""
    from .models.models import Base, User, PayrollSetting
    from .auth.auth import get_password_hash
    
    # テーブルの作成
    Base.metadata.create_all(bind=engine)
    
    # 初期データの作成
    db = SessionLocal()
    try:
        # 管理者ユーザーが存在しない場合、作成
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                full_name="管理者",
                role="admin",
                is_active=True,
                force_password_change=False
            )
            db.add(admin_user)
        
        # 給与設定が存在しない場合、デフォルト設定を作成
        payroll_setting = db.query(PayrollSetting).first()
        if not payroll_setting:
            default_setting = PayrollSetting()
            db.add(default_setting)
        
        db.commit()
    except Exception as e:
        print(f"Error during DB initialization: {e}")
        db.rollback()
    finally:
        db.close() 