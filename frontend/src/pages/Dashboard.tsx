import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { attendanceApi, shiftsApi } from "../api/client";
import { SrcSchemasAttendanceAttendanceResponse, ShiftResponse } from "../api/generated";
import QuickAttendance from "../components/QuickAttendance";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  CheckCircle as CheckInIcon,
  ExitToApp as CheckOutIcon,
  AccessTime as ClockIcon,
  Event as CalendarIcon,
  TrendingUp as StatsIcon,
} from "@mui/icons-material";

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<SrcSchemasAttendanceAttendanceResponse | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 今日の勤怠記録を取得
      const today = new Date().toISOString().split('T')[0];
      const attendanceRecords = await attendanceApi.getMyAttendanceRecordsApiAttendanceMyRecordsGet(today, today);
      if (attendanceRecords.length > 0) {
        setTodayAttendance(attendanceRecords[0]);
      }

      // 月間統計を取得
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const stats = await attendanceApi.getMonthlyAttendanceStatsApiAttendanceMonthlyStatsGet(currentYear, currentMonth);
      setMonthlyStats(stats);

      // 今後のシフトを取得
      const shifts = await shiftsApi.getMyShiftsApiShiftsMyShiftsGet(today);
      setUpcomingShifts(shifts);
    } catch (err) {
      setError("データの取得に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceUpdate = () => {
    fetchDashboardData();
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
        ダッシュボード
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        {user?.full_name}さん、お疲れ様です
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 本日の勤務状況 */}
        <Grid item xs={12} sm={6} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ClockIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                本日の勤務状況
              </Typography>
              <Box sx={{ mt: 2 }}>
                {todayAttendance ? (
                  <>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          出勤時刻
                        </Typography>
                        <Typography variant="h6">
                          {formatTime(todayAttendance.check_in_time)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          退勤時刻
                        </Typography>
                        <Typography variant="h6">
                          {formatTime(todayAttendance.check_out_time)}
                        </Typography>
                      </Grid>
                    </Grid>
                    {!todayAttendance.check_out_time && (
                      <Box sx={{ mt: 2 }}>
                        <QuickAttendance onSuccess={handleAttendanceUpdate} />
                      </Box>
                    )}
                  </>
                ) : (
                  <>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      本日はまだ出勤していません
                    </Typography>
                    <QuickAttendance onSuccess={handleAttendanceUpdate} />
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 今月の勤務サマリー */}
        <Grid item xs={12} sm={6} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <StatsIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                今月の勤務サマリー
              </Typography>
              {monthlyStats ? (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      出勤日数
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {monthlyStats.work_days || 0} 日
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      総労働時間
                    </Typography>
                    <Typography variant="h6">
                      {monthlyStats.total_hours?.toFixed(1) || 0} 時間
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      残業時間
                    </Typography>
                    <Typography variant="h6">
                      {monthlyStats.overtime_hours?.toFixed(1) || 0} 時間
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      見込み給与
                    </Typography>
                    <Typography variant="h6">
                      ¥{monthlyStats.estimated_salary?.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  データがありません
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 今後のシフト */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CalendarIcon sx={{ verticalAlign: "middle", mr: 1 }} />
                今後のシフト
              </Typography>
              {upcomingShifts.length > 0 ? (
                <List>
                  {upcomingShifts.map((shift) => (
                    <ListItem key={shift.id} divider>
                      <ListItemText
                        primary={formatDate(shift.date)}
                        secondary={
                          shift.start_time && shift.end_time
                            ? `${shift.start_time} - ${shift.end_time}`
                            : "時間未定"
                        }
                      />
                      <Chip
                        label={
                          shift.status === "confirmed"
                            ? "確定"
                            : shift.status === "pending"
                            ? "申請中"
                            : "却下"
                        }
                        color={
                          shift.status === "confirmed"
                            ? "success"
                            : shift.status === "pending"
                            ? "default"
                            : "error"
                        }
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  登録されているシフトはありません
                </Typography>
              )}
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate("/shift")}
              >
                シフト管理へ
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 管理者向け情報 */}
        {isAdmin && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  管理者メニュー
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate("/team/monthly")}
                    >
                      チーム勤怠確認
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate("/employees")}
                    >
                      社員管理
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => navigate("/payslips/management")}
                    >
                      給与計算
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;