import React from "react";

interface UserSummary {
  user_id: number;
  user_full_name: string;
  total_days: number;
  total_hours: number;
}

interface TeamSummaryProps {
  userSummary: { [key: number]: UserSummary };
}

const TeamSummary: React.FC<TeamSummaryProps> = ({ userSummary }) => {
  if (Object.keys(userSummary).length === 0) {
    return (
      <div className="no-records">
        <p>この月の勤怠記録はありません</p>
      </div>
    );
  }

  return (
    <div className="team-summary">
      <h3>チームサマリー</h3>
      <table className="summary-table">
        <thead>
          <tr>
            <th>名前</th>
            <th>勤務日数</th>
            <th>総勤務時間</th>
            <th>平均勤務時間/日</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(userSummary).map((user) => (
            <tr key={user.user_id}>
              <td>{user.user_full_name}</td>
              <td>{user.total_days}日</td>
              <td>{user.total_hours.toFixed(2)}時間</td>
              <td>{(user.total_hours / user.total_days).toFixed(2)}時間</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamSummary;
