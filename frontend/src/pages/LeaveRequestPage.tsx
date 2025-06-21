import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
// import { leaveApi } from "../api/client";
import axios from "axios";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  EventAvailable as EventIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ja } from "date-fns/locale";

interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  days_count: number;
  leave_type: string;
  reason?: string;
  status: string;
  admin_comment?: string;
  created_at: string;
}

interface LeaveBalance {
  total_days: number;
  used_days: number;
  remaining_days: number;
}

const LeaveRequestPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // フォームの状態
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [leaveType, setLeaveType] = useState("paid");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 休暇申請一覧を取得
      // TODO: LeaveApiが生成されたら正式APIに置き換え
      const token = localStorage.getItem("token");
      const requestsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/leaves/my-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(requestsResponse.data || []);

      // 有給休暇残日数を取得
      const balanceResponse = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/leaves/my-balance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBalance(balanceResponse.data);
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate) {
      setError("開始日と終了日を選択してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/leaves/`,
        {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          leave_type: leaveType,
          reason: reason || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("休暇申請を送信しました");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      setError("休暇申請の送信に失敗しました");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStartDate(null);
    setEndDate(null);
    setLeaveType("paid");
    setReason("");
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "approved":
        return <Chip label="承認済み" color="success" size="small" />;
      case "rejected":
        return <Chip label="却下" color="error" size="small" />;
      case "canceled":
        return <Chip label="取消" size="small" />;
      default:
        return <Chip label="申請中" color="warning" size="small" />;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "paid":
        return "有給休暇";
      case "unpaid":
        return "無給休暇";
      case "sick":
        return "病気休暇";
      case "special":
        return "特別休暇";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4">休暇申請</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          新規申請
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* 有給休暇残日数 */}
      {balance && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  付与日数
                </Typography>
                <Typography variant="h4">{balance.total_days}日</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  使用日数
                </Typography>
                <Typography variant="h4">{balance.used_days}日</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  残日数
                </Typography>
                <Typography variant="h4" color="primary">
                  {balance.remaining_days}日
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 申請一覧 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>申請日</TableCell>
              <TableCell>開始日</TableCell>
              <TableCell>終了日</TableCell>
              <TableCell>日数</TableCell>
              <TableCell>種別</TableCell>
              <TableCell>理由</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>管理者コメント</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  休暇申請はありません
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    {new Date(request.start_date).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    {new Date(request.end_date).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>{request.days_count}</TableCell>
                  <TableCell>{getLeaveTypeLabel(request.leave_type)}</TableCell>
                  <TableCell>{request.reason || "-"}</TableCell>
                  <TableCell>{getStatusChip(request.status)}</TableCell>
                  <TableCell>{request.admin_comment || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新規申請ダイアログ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <EventIcon sx={{ mr: 1 }} />
            休暇申請
          </Box>
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="開始日"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="終了日"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  minDate={startDate || undefined}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>休暇種別</InputLabel>
                  <Select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    label="休暇種別"
                  >
                    <MenuItem value="paid">有給休暇</MenuItem>
                    <MenuItem value="unpaid">無給休暇</MenuItem>
                    <MenuItem value="sick">病気休暇</MenuItem>
                    <MenuItem value="special">特別休暇</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="理由"
                  multiline
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="休暇の理由を入力してください（任意）"
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !startDate || !endDate}
          >
            {submitting ? "送信中..." : "申請"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeaveRequestPage;