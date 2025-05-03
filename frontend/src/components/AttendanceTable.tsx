import React from "react";

interface AttendanceRecord {
  id: number;
  user_id?: number;
  user_full_name?: string;
  check_in_time: string;
  check_out_time: string | null;
  total_working_hours: number | null;
  memo: string | null;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  showUserName?: boolean;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  showUserName = false,
}) => {
  if (records.length === 0) {
    return (
      <div className="no-records">
        <p>この期間の勤怠記録はありません</p>
      </div>
    );
  }

  return (
    <table className="records-table">
      <thead>
        <tr>
          {showUserName && <th>名前</th>}
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
            {showUserName && <td>{record.user_full_name || "-"}</td>}
            <td>
              {new Date(record.check_in_time).toLocaleDateString("ja-JP")}
            </td>
            <td>
              {new Date(record.check_in_time).toLocaleTimeString("ja-JP")}
            </td>
            <td>
              {record.check_out_time
                ? new Date(record.check_out_time).toLocaleTimeString("ja-JP")
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
  );
};

export default AttendanceTable;
