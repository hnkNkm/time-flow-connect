import React, { useState, useEffect } from "react";
import { attendanceAPI, shiftAPI } from "../services/api";
import {
  DateSelector,
  MonthlyStats,
  AttendanceTable,
  LoadingSpinner,
  ErrorMessage,
  EstimatedSalary,
} from "../components";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";

interface AttendanceRecord {
  id: number;
  check_in_time: string;
  check_out_time: string | null;
  total_working_hours: number | null;
  memo: string | null;
}

interface MonthlyStatsData {
  user_id: number;
  user_full_name: string;
  total_days_worked: number;
  total_working_hours: number;
  total_overtime_hours: number;
  estimated_salary: number;
}

const MonthlyAttendancePage: React.FC = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<MonthlyStatsData | null>(null);
  const [estimatedSalary, setEstimatedSalary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 月間勤怠記録の取得
        const recordsResponse = await attendanceAPI.getMyMonthlyRecords(
          year,
          month
        );
        setRecords(recordsResponse.data);

        // 月間統計の取得
        const statsResponse = await attendanceAPI.getMonthlyStats(year, month);
        setStats(statsResponse.data);

        // シフトベースの見込み給与を取得
        try {
          const estimatedResponse = await shiftAPI.getEstimatedSalary(year, month);
          console.log("見込み給与レスポンス:", estimatedResponse.data);
          setEstimatedSalary(estimatedResponse.data);
        } catch (estimatedErr: any) {
          console.error("見込み給与データ取得エラー:", estimatedErr);
          console.error("エラー詳細:", estimatedErr.response?.data);
          // 見込み給与の取得に失敗しても他のデータは表示
          setEstimatedSalary(null);
        }
      } catch (err) {
        console.error("月間勤怠データ取得エラー:", err);
        setError("月間勤怠データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [year, month]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  return (
    <div className="monthly-attendance-page">
      <h2>月間勤怠記録</h2>

      {/* 年月の選択 */}
      <DateSelector
        year={year}
        month={month}
        onYearChange={handleYearChange}
        onMonthChange={handleMonthChange}
      />

      <ErrorMessage message={error} />
      <LoadingSpinner loading={loading} text="データを読み込み中..." />

      {!loading && (
        <>
          {/* 統計情報 */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {/* 実績の月間統計 */}
              {stats && <MonthlyStats stats={stats} />}
            </Grid>
            <Grid item xs={12} md={6}>
              {/* シフトベースの見込み給与 */}
              <EstimatedSalary data={estimatedSalary} />
            </Grid>
          </Grid>

          {/* 月間勤怠記録一覧 */}
          <Box mt={3}>
            <h3>勤怠記録</h3>
            <AttendanceTable records={records} />
          </Box>
        </>
      )}
    </div>
  );
};

export default MonthlyAttendancePage;
