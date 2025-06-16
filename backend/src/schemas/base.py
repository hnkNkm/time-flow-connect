"""
共通のPydantic設定とベースモデル
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class BaseSchema(BaseModel):
    """
    全てのスキーマの基底クラス
    Pydantic v2のConfigDictを使用
    """
    model_config = ConfigDict(
        from_attributes=True,  # SQLAlchemyモデルからの変換を許可
        str_strip_whitespace=True,  # 文字列の前後の空白を自動削除
        json_encoders={
            datetime: lambda v: v.isoformat()  # datetimeのシリアライズ
        }
    )


class TimestampSchema(BaseSchema):
    """タイムスタンプを持つスキーマの基底クラス"""
    created_at: datetime
    updated_at: Optional[datetime] = None


class IdSchema(BaseSchema):
    """IDを持つスキーマの基底クラス"""
    id: int