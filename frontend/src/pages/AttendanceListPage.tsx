import React, { useState, useEffect } from "react";
import { attendanceAPI } from "../services/api";

interface AttendanceRecord {
  id: number;
  check_in_time: string;
  check_out_time: string | null;
  total_working_hours: number | null;
  memo: string | null;
}

const AttendanceListPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        const response = await attendanceAPI.getMyRecords();
        setRecords(response.data);
      } catch (err) {
        console.error("勤怠記録取得エラー:", err);
        setError("勤怠記録の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="attendance-list-page">
      <h2>勤怠記録一覧</h2>

      {records.length === 0 ? (
        <div className="no-records">
          <p>勤怠記録がありません</p>
        </div>
      ) : (
        <div className="records-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>出勤時間</th>
                <th>退勤時間</th>
                <th>勤務時間</th>
                <th>メモ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    {new Date(record.check_in_time).toLocaleDateString("ja-JP")}
                  </td>
                  <td>
                    {new Date(record.check_in_time).toLocaleTimeString("ja-JP")}
                  </td>
                  <td>
                    {record.check_out_time
                      ? new Date(record.check_out_time).toLocaleTimeString(
                          "ja-JP"
                        )
                      : "-"}
                  </td>
                  <td>
                    {record.total_working_hours
                      ? `${record.total_working_hours.toFixed(2)}時間`
                      : "-"}
                  </td>
                  <td>{record.memo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceListPage;
