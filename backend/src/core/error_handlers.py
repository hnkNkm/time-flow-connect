"""
グローバルエラーハンドラー
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, DataError
from pydantic import ValidationError
import logging

from .exceptions import BaseAPIException

logger = logging.getLogger(__name__)


async def base_api_exception_handler(request: Request, exc: BaseAPIException):
    """カスタム例外のハンドラー"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            "status_code": exc.status_code
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """バリデーションエラーのハンドラー"""
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "入力データが不正です",
            "error_code": "VALIDATION_ERROR",
            "errors": errors
        }
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """データベース整合性エラーのハンドラー"""
    logger.error(f"IntegrityError: {str(exc)}")
    
    # 重複エラーの場合
    if "duplicate key" in str(exc).lower() or "unique constraint" in str(exc).lower():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "データが既に存在します",
                "error_code": "DUPLICATE_ERROR"
            }
        )
    
    # 外部キー制約エラーの場合
    if "foreign key" in str(exc).lower():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "detail": "参照先のデータが存在しません",
                "error_code": "FOREIGN_KEY_ERROR"
            }
        )
    
    # その他のIntegrityError
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "データベースエラーが発生しました",
            "error_code": "DATABASE_ERROR"
        }
    )


async def data_error_handler(request: Request, exc: DataError):
    """データ型エラーのハンドラー"""
    logger.error(f"DataError: {str(exc)}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "入力データの形式が不正です",
            "error_code": "DATA_FORMAT_ERROR"
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """一般的な例外のハンドラー"""
    logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "サーバーエラーが発生しました",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )