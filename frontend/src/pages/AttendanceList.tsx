import { useState, useEffect } from "react";
import { fetchAttendance, AttendanceRecord } from "../services/api";

export default function AttendanceList() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await fetchAttendance();
        setRecords(data);
      } catch (err) {
        setError("勤怠記録の取得に失敗しました");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="attendance-list">
      <h1>勤怠記録一覧</h1>
      {records.length === 0 ? (
        <div className="card">
          <p>まだ勤怠記録がありません。</p>
        </div>
      ) : (
        <div className="records-grid">
          {records.map((record) => (
            <div key={record.id} className="card record-card">
              <h3>{record.employee_name}</h3>
              <p>
                チェックイン時間：
                {new Date(record.check_in_time).toLocaleString("ja-JP")}
              </p>
              {record.memo && (
                <p className="memo">
                  メモ：
                  <br />
                  {record.memo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
