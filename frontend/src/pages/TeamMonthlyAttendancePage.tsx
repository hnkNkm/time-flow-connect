import React, { useState, useEffect } from "react";
import { attendanceAPI } from "../services/api";
import {
  DateSelector,
  TeamSummary,
  AttendanceTable,
  LoadingSpinner,
  ErrorMessage,
} from "../components";

interface AttendanceRecord {
  id: number;
  user_id: number;
  user_full_name: string;
  check_in_time: string;
  check_out_time: string | null;
  total_working_hours: number | null;
  memo: string | null;
}

interface UserSummary {
  user_id: number;
  user_full_name: string;
  total_days: number;
  total_hours: number;
}

const TeamMonthlyAttendancePage: React.FC = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamAttendance = async () => {
      setLoading(true);
      setError(null);

      try {
        // 月の開始日と終了日を計算
        const startDate = new Date(year, month - 1, 1)
          .toISOString()
          .split("T")[0];
        const endDate = new Date(year, month, 0).toISOString().split("T")[0];

        // チーム全体の勤怠記録を取得
        const response = await attendanceAPI.getAllRecords({
          start_date: startDate,
          end_date: endDate,
        });

        setRecords(response.data);
      } catch (err) {
        console.error("チーム勤怠データ取得エラー:", err);
        setError("チーム勤怠データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAttendance();
  }, [year, month]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  // ユーザーごとに集計したデータを作成
  const userSummary = records.reduce(
    (acc: { [key: number]: UserSummary }, record) => {
      const userId = record.user_id;

      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          user_full_name: record.user_full_name,
          total_days: 0,
          total_hours: 0,
        };
      }

      // 勤務日数をカウント
      acc[userId].total_days += 1;

      // 勤務時間を加算
      if (record.total_working_hours) {
        acc[userId].total_hours += record.total_working_hours;
      }

      return acc;
    },
    {}
  );

  return (
    <div className="team-monthly-page">
      <h2>チーム月間勤怠管理</h2>

      {/* 年月の選択 */}
      <DateSelector
        year={year}
        month={month}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
      />

      <ErrorMessage message={error} />
      <LoadingSpinner loading={loading} text="チームデータを読み込み中..." />

      {!loading && (
        <>
          {/* チーム全体の勤怠サマリー */}
          <TeamSummary userSummary={userSummary} />

          {/* 全員の勤怠記録一覧 */}
          <div className="team-records">
            <h3>勤怠記録詳細</h3>
            <AttendanceTable records={records} showUserName={true} />
          </div>
        </>
      )}
    </div>
  );
};

export default TeamMonthlyAttendancePage;
