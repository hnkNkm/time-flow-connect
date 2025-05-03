from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from .database import init_db
from .routers import auth, attendance, shift
# 一時的にコメントアウト - 問題解決後に戻す
# from .routers import users, payroll, department, leave, report

# テスト用の一時的なデータストア
attendance_records = []

class AttendanceCreate(BaseModel):
    employee_name: str
    check_in_time: str
    memo: Optional[str] = None

class AttendanceResponse(AttendanceCreate):
    id: str

class ApiResponse(BaseModel):
    status: str
    data: Dict[str, Any]
    message: str

app = FastAPI(
    title="TimeFlowConnect API",
    description="Time tracking and shift management API for businesses",
    version="0.1.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(shift.router)
# 一時的にコメントアウト - 問題解決後に戻す
# app.include_router(users.router)
# app.include_router(payroll.router)
# app.include_router(department.router)
# app.include_router(leave.router)
# app.include_router(report.router)

# データベースの初期化
@app.on_event("startup")
async def startup_event():
    init_db()

# ルートエンドポイント
@app.get("/")
async def root():
    return {"message": "Welcome to TimeFlowConnect API"}

# テスト用APIエンドポイント
@app.get("/api/hello")
async def hello():
    return {"message": "こんにちは！TimeFlowConnectへようこそ！"}

# 勤怠データ登録エンドポイント
@app.post("/api/attendance", response_model=ApiResponse)
async def create_attendance(attendance: AttendanceCreate):
    # 新しいレコードを作成
    record = {
        "id": "dummy-id-" + datetime.now().strftime("%Y%m%d%H%M%S"),
        **attendance.dict()
    }
    # テスト用のデータストアに保存
    attendance_records.append(record)
    return {
        "status": "success",
        "data": record,
        "message": f"{attendance.employee_name}さんの勤怠を登録しました"
    }

# 勤怠データ取得エンドポイント
@app.get("/api/attendance", response_model=List[AttendanceResponse])
async def get_attendance():
    return attendance_records

# AWS Lambda用ハンドラー
handler = Mangum(app)

# ルーターのインポートと登録は実装後に追加
# from .routers import users, attendance, leave_requests
# app.include_router(users.router)
# app.include_router(attendance.router)
# app.include_router(leave_requests.router) 