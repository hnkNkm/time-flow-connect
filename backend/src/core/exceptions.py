"""
カスタム例外クラスとエラーハンドリング
"""
from typing import Optional, Dict, Any
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """APIの基底例外クラス"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class NotFoundException(BaseAPIException):
    """リソースが見つからない場合の例外"""
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource}が見つかりません (ID: {identifier})",
            error_code="RESOURCE_NOT_FOUND"
        )


class UnauthorizedException(BaseAPIException):
    """認証エラー"""
    def __init__(self, detail: str = "認証が必要です"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
            error_code="UNAUTHORIZED"
        )


class ForbiddenException(BaseAPIException):
    """権限エラー"""
    def __init__(self, detail: str = "この操作を行う権限がありません"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN"
        )


class BadRequestException(BaseAPIException):
    """不正なリクエスト"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BAD_REQUEST"
        )


class ConflictException(BaseAPIException):
    """競合エラー"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT"
        )


class ValidationException(BaseAPIException):
    """バリデーションエラー"""
    def __init__(self, detail: str, field: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR"
        )
        self.field = field


class InternalServerError(BaseAPIException):
    """内部サーバーエラー"""
    def __init__(self, detail: str = "サーバーエラーが発生しました"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INTERNAL_SERVER_ERROR"
        )