import React, { useState, useEffect } from "react";
import { attendanceAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  AttendanceStatusCard,
  DateTimeInput,
  TextArea,
  PrimaryButton,
  LoadingSpinner,
  ErrorMessage,
  SuccessMessage,
} from "../components";
import "../styles/AttendanceFormPage.css";

interface AttendanceFormData {
  check_in_time: string;
  check_out_time: string;
  break_start_time: string;
  break_end_time: string;
  memo: string;
}

interface AttendanceRecord {
  id: number;
  check_in_time: string;
  check_out_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  total_working_hours: number | null;
  memo: string | null;
}

const getCurrentDateTime = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 16); // YYYY-MM-DDThh:mm 形式
};

const AttendanceFormPage: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<AttendanceFormData>({
    check_in_time: getCurrentDateTime(),
    check_out_time: "",
    break_start_time: "",
    break_end_time: "",
    memo: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] =
    useState<AttendanceRecord | null>(null);

  // 本日の勤怠記録を取得
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const response = await attendanceAPI.getMyRecords({
          start_date: today,
          end_date: today,
        });

        if (response.data && response.data.length > 0) {
          setTodayAttendance(response.data[0]);
        }
      } catch (err) {
        console.error("本日の勤怠取得エラー:", err);
      }
    };

    fetchTodayAttendance();
  }, []);

  // フォーム入力の処理
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // 出勤登録
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await attendanceAPI.checkIn({
        check_in_time: formData.check_in_time,
        memo: formData.memo,
      });

      setTodayAttendance(response.data);
      setSuccess("出勤を登録しました");

      // フォームリセット
      setFormData({
        ...formData,
        memo: "",
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "出勤登録に失敗しました");
      console.error("出勤登録エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  // 退勤登録
  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!todayAttendance) {
      setError("出勤記録が見つかりません");
      return;
    }

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await attendanceAPI.checkOut(todayAttendance.id, {
        check_out_time: formData.check_out_time || getCurrentDateTime(),
        break_start_time: formData.break_start_time || null,
        break_end_time: formData.break_end_time || null,
        memo: formData.memo || todayAttendance.memo,
      });

      setTodayAttendance(response.data);
      setSuccess("退勤を登録しました");

      // フォームリセット
      setFormData({
        ...formData,
        memo: "",
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "退勤登録に失敗しました");
      console.error("退勤登録エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-form-page">
      <h2>勤怠申請</h2>

      {/* 勤怠状況表示 */}
      <AttendanceStatusCard
        userName={user?.full_name || "ユーザー"}
        attendance={todayAttendance}
      />

      {/* メッセージ表示 */}
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />
      <LoadingSpinner loading={loading} text="処理中..." />

      {/* 勤怠申請フォーム */}
      <div className="attendance-form-container">
        {!todayAttendance ? (
          // 出勤登録フォーム
          <form onSubmit={handleCheckIn} className="attendance-form">
            <h3>出勤登録</h3>

            <DateTimeInput
              id="check_in_time"
              name="check_in_time"
              value={formData.check_in_time}
              onChange={handleChange}
              label="出勤時間"
              required
            />

            <TextArea
              id="memo"
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              label="メモ"
              rows={3}
            />

            <PrimaryButton
              type="submit"
              onClick={() => {}}
              disabled={loading}
              className="submit-button"
            >
              {loading ? "処理中..." : "出勤登録"}
            </PrimaryButton>
          </form>
        ) : !todayAttendance.check_out_time ? (
          // 退勤登録フォーム
          <form onSubmit={handleCheckOut} className="attendance-form">
            <h3>退勤登録</h3>

            <DateTimeInput
              id="check_out_time"
              name="check_out_time"
              value={formData.check_out_time || getCurrentDateTime()}
              onChange={handleChange}
              label="退勤時間"
              required
            />

            <DateTimeInput
              id="break_start_time"
              name="break_start_time"
              value={formData.break_start_time}
              onChange={handleChange}
              label="休憩開始時間"
            />

            <DateTimeInput
              id="break_end_time"
              name="break_end_time"
              value={formData.break_end_time}
              onChange={handleChange}
              label="休憩終了時間"
            />

            <TextArea
              id="memo"
              name="memo"
              value={formData.memo}
              onChange={handleChange}
              label="メモ"
              rows={3}
            />

            <PrimaryButton
              type="submit"
              onClick={() => {}}
              disabled={loading}
              className="submit-button"
            >
              {loading ? "処理中..." : "退勤登録"}
            </PrimaryButton>
          </form>
        ) : (
          // 勤怠完了
          <div className="attendance-complete">
            <h3>本日の勤怠登録完了</h3>
            <p>勤務お疲れ様でした！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceFormPage;
