import React from "react";

interface AttendanceRecord {
  id: number;
  check_in_time: string;
  check_out_time: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  total_working_hours?: number | null;
  memo: string | null;
}

interface AttendanceStatusCardProps {
  userName: string;
  attendance: AttendanceRecord | null;
}

const AttendanceStatusCard: React.FC<AttendanceStatusCardProps> = ({
  userName,
  attendance,
}) => {
  return (
    <div className="attendance-status">
      <h3>本日の勤怠状況</h3>
      <div className="status-card">
        <p>
          <strong>名前:</strong> {userName}
        </p>
        <p>
          <strong>日付:</strong> {new Date().toLocaleDateString("ja-JP")}
        </p>
        {attendance ? (
          <>
            <p>
              <strong>出勤時間:</strong>{" "}
              {attendance.check_in_time
                ? new Date(attendance.check_in_time).toLocaleTimeString("ja-JP")
                : "未登録"}
            </p>
            <p>
              <strong>退勤時間:</strong>{" "}
              {attendance.check_out_time
                ? new Date(attendance.check_out_time).toLocaleTimeString(
                    "ja-JP"
                  )
                : "未登録"}
            </p>
            {attendance.break_start_time && (
              <p>
                <strong>休憩開始:</strong>{" "}
                {new Date(attendance.break_start_time).toLocaleTimeString(
                  "ja-JP"
                )}
              </p>
            )}
            {attendance.break_end_time && (
              <p>
                <strong>休憩終了:</strong>{" "}
                {new Date(attendance.break_end_time).toLocaleTimeString(
                  "ja-JP"
                )}
              </p>
            )}
            {attendance.total_working_hours !== undefined &&
              attendance.total_working_hours !== null && (
                <p>
                  <strong>勤務時間:</strong>{" "}
                  {attendance.total_working_hours.toFixed(2)} 時間
                </p>
              )}
            {attendance.memo && (
              <p>
                <strong>メモ:</strong> {attendance.memo}
              </p>
            )}
          </>
        ) : (
          <p>本日の勤怠記録はまだありません</p>
        )}
      </div>
    </div>
  );
};

export default AttendanceStatusCard;
