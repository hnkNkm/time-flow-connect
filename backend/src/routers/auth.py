from fastapi import APIRouter, Depends, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Dict

from ..database import get_db
from ..models.models import User
from ..models.enums import UserRole
from ..auth.auth import (
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash
)
from ..schemas.auth import (
    Token, 
    UserCreate, 
    UserResponse, 
    ChangePasswordRequest,
    PasswordResetRequest
)
from ..core.dependencies import get_current_active_user
from ..core.exceptions import (
    UnauthorizedException,
    BadRequestException,
    ConflictException,
    NotFoundException
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """ログイン（アクセストークン取得）"""
    # ユーザー認証
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise UnauthorizedException("ユーザー名またはパスワードが正しくありません")
    
    if not user.is_active:
        raise BadRequestException("アカウントが無効です")
    
    # トークン生成
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
) -> UserResponse:
    """現在のログインユーザーの情報を取得"""
    return current_user


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(
    user_data: UserCreate, 
    db: Session = Depends(get_db)
) -> UserResponse:
    """新規ユーザー登録"""
    # 重複チェック (ユーザー名)
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise ConflictException("このユーザー名は既に使用されています")
    
    # 重複チェック (メール)
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise ConflictException("このメールアドレスは既に登録されています")
    
    # ユーザー作成
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username.lower(),  # 小文字に統一
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        hourly_rate=user_data.hourly_rate,
        is_active=True,
        force_password_change=True  # 初回ログイン時にパスワード変更を要求
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, str]:
    """パスワード変更"""
    # 現在のパスワードを検証
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise BadRequestException("現在のパスワードが正しくありません")
    
    # パスワードの更新
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.force_password_change = False  # パスワード変更フラグをクリア
    
    db.commit()
    
    return {"message": "パスワードが正常に変更されました"}


@router.post("/password-reset-request")
async def request_password_reset(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """パスワードリセット要求"""
    # ユーザーの存在確認
    user = db.query(User).filter(User.email == reset_data.email).first()
    if not user:
        # セキュリティのため、ユーザーが存在しない場合も成功レスポンスを返す
        return {"message": "パスワードリセットのメールを送信しました（登録されている場合）"}
    
    # TODO: パスワードリセットトークンの生成とメール送信
    # 実装例:
    # - リセットトークンを生成
    # - データベースに保存
    # - メールで送信
    
    return {"message": "パスワードリセットのメールを送信しました（登録されている場合）"}


@router.get("/check-auth")
async def check_authentication(
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, any]:
    """認証状態の確認"""
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.value,
        "force_password_change": current_user.force_password_change
    }