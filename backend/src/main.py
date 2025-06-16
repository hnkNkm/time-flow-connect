from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, DataError
from mangum import Mangum
import logging

from .database import init_db
from .routers import auth, attendance, shift
from .core.exceptions import BaseAPIException
from .core.error_handlers import (
    base_api_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    data_error_handler,
    general_exception_handler
)

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPIアプリケーションの作成
app = FastAPI(
    title="TimeFlowConnect API",
    description="Time tracking and shift management API for businesses",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://timeflowconnect.com"  # 本番用
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# エラーハンドラーの登録
app.add_exception_handler(BaseAPIException, base_api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(DataError, data_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ルーターの登録
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(shift.router)

# 今後追加予定のルーター
# app.include_router(users.router)
# app.include_router(leave.router)
# app.include_router(department.router)
# app.include_router(payroll.router)
# app.include_router(report.router)

# データベースの初期化
@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の処理"""
    logger.info("Starting TimeFlowConnect API...")
    init_db()
    logger.info("Database initialized successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時の処理"""
    logger.info("Shutting down TimeFlowConnect API...")

# ヘルスチェックエンドポイント
@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    return {
        "status": "healthy",
        "service": "TimeFlowConnect API",
        "version": "1.0.0"
    }

# ルートエンドポイント
@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Welcome to TimeFlowConnect API",
        "docs": "/api/docs",
        "health": "/api/health"
    }

# AWS Lambda用ハンドラー
handler = Mangum(app)