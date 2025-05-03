import React from "react";

interface MonthlyStatsData {
  user_id: number;
  user_full_name: string;
  total_days_worked: number;
  total_working_hours: number;
  total_overtime_hours: number;
  estimated_salary: number;
}

interface MonthlyStatsProps {
  stats: MonthlyStatsData;
}

const MonthlyStats: React.FC<MonthlyStatsProps> = ({ stats }) => {
  return (
    <div className="monthly-stats">
      <h3>月間サマリー</h3>
      <div className="stats-card">
        <div className="stats-row">
          <div className="stats-item">
            <span className="stats-label">勤務日数</span>
            <span className="stats-value">{stats.total_days_worked}日</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">総勤務時間</span>
            <span className="stats-value">
              {stats.total_working_hours.toFixed(2)}時間
            </span>
          </div>
          <div className="stats-item">
            <span className="stats-label">残業時間</span>
            <span className="stats-value">
              {stats.total_overtime_hours.toFixed(2)}時間
            </span>
          </div>
          <div className="stats-item">
            <span className="stats-label">給与見込</span>
            <span className="stats-value">
              ¥{stats.estimated_salary.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyStats;
