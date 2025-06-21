import React, { useState, useEffect } from "react";
import { payslipAPI, employeeAPI } from "../services/api";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Calculate as CalculateIcon,
  CheckCircle as ConfirmIcon,
  Payment as PaymentIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

interface Payslip {
  id: number;
  user_id: number;
  user_name: string;
  employee_code?: string;
  year: number;
  month: number;
  work_days: number;
  total_hours: number;
  gross_salary: number;
  net_salary: number;
  status: string;
  confirmed_at?: string;
  paid_at?: string;
}

interface Employee {
  id: number;
  full_name: string;
  employee_code?: string;
}

const PayslipManagementPage: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedPayslips, setSelectedPayslips] = useState<number[]>([]);
  
  // ダイアログ
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 給与明細取得
      const payslipResponse = await payslipAPI.getAllPayslips({
        year: selectedYear,
        month: selectedMonth,
      });
      setPayslips(payslipResponse.data.items);

      // 従業員リスト取得
      const employeeResponse = await employeeAPI.getEmployees({
        is_active: true,
        per_page: 100,
      });
      setEmployees(employeeResponse.data.items);
    } catch (err: any) {
      console.error("データ取得エラー:", err);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    try {
      const response = await payslipAPI.calculatePayslips({
        year: selectedYear,
        month: selectedMonth,
      });
      
      alert(
        `給与計算が完了しました\n` +
        `新規作成: ${response.data.created_count}件\n` +
        `更新: ${response.data.updated_count}件\n` +
        `エラー: ${response.data.error_count}件`
      );
      
      setCalculateDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("給与計算エラー:", err);
      alert("給与計算に失敗しました");
    }
  };

  const handleConfirm = async () => {
    try {
      await payslipAPI.confirmPayslips(selectedPayslips);
      alert(`${selectedPayslips.length}件の給与明細を確定しました`);
      setConfirmDialogOpen(false);
      setSelectedPayslips([]);
      fetchData();
    } catch (err: any) {
      console.error("確定エラー:", err);
      alert("確定処理に失敗しました");
    }
  };

  const handlePayment = async () => {
    try {
      await payslipAPI.recordPayment({
        payslip_ids: selectedPayslips,
        payment_date: paymentDate,
      });
      alert(`${selectedPayslips.length}件の支払いを記録しました`);
      setPaymentDialogOpen(false);
      setSelectedPayslips([]);
      fetchData();
    } catch (err: any) {
      console.error("支払い記録エラー:", err);
      alert("支払い記録に失敗しました");
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedPayslips(payslips.map((p) => p.id));
    } else {
      setSelectedPayslips([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedPayslips((prev) =>
      prev.includes(id)
        ? prev.filter((pid) => pid !== id)
        : [...prev, id]
    );
  };

  const getStatusChip = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: any } } = {
      draft: { label: "作成中", color: "default" },
      confirmed: { label: "確定", color: "primary" },
      paid: { label: "支払済", color: "success" },
    };

    const config = statusMap[status] || { label: status, color: "default" };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const draftPayslips = selectedPayslips.filter(
    (id) => payslips.find((p) => p.id === id)?.status === "draft"
  );
  const confirmedPayslips = selectedPayslips.filter(
    (id) => payslips.find((p) => p.id === id)?.status === "confirmed"
  );

  return (
    <div className="payslip-management-page">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h2>給与計算管理</h2>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>年</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              label="年"
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}年
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>月</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              label="月"
            >
              {months.map((month) => (
                <MenuItem key={month} value={month}>
                  {month}月
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<CalculateIcon />}
            onClick={() => setCalculateDialogOpen(true)}
          >
            給与計算
          </Button>
        </Box>
      </Box>

      {selectedPayslips.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography>
              {selectedPayslips.length}件選択中
            </Typography>
            <Box display="flex" gap={1}>
              {draftPayslips.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ConfirmIcon />}
                  onClick={() => setConfirmDialogOpen(true)}
                >
                  確定 ({draftPayslips.length}件)
                </Button>
              )}
              {confirmedPayslips.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PaymentIcon />}
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  支払記録 ({confirmedPayslips.length}件)
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : payslips.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <p>給与明細がありません。「給与計算」ボタンから計算を実行してください。</p>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedPayslips.length > 0 &&
                      selectedPayslips.length < payslips.length
                    }
                    checked={selectedPayslips.length === payslips.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>社員コード</TableCell>
                <TableCell>氏名</TableCell>
                <TableCell align="right">出勤日数</TableCell>
                <TableCell align="right">総労働時間</TableCell>
                <TableCell align="right">総支給額</TableCell>
                <TableCell align="right">控除合計</TableCell>
                <TableCell align="right">差引支給額</TableCell>
                <TableCell>状態</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payslips.map((payslip) => (
                <TableRow key={payslip.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPayslips.includes(payslip.id)}
                      onChange={() => handleSelect(payslip.id)}
                    />
                  </TableCell>
                  <TableCell>{payslip.employee_code || "-"}</TableCell>
                  <TableCell>{payslip.user_name}</TableCell>
                  <TableCell align="right">{payslip.work_days}日</TableCell>
                  <TableCell align="right">
                    {payslip.total_hours.toFixed(1)}時間
                  </TableCell>
                  <TableCell align="right">
                    ¥{payslip.gross_salary.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ¥{(payslip.gross_salary - payslip.net_salary).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ¥{payslip.net_salary.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusChip(payslip.status)}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      disabled={payslip.status !== "draft"}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 給与計算ダイアログ */}
      <Dialog open={calculateDialogOpen} onClose={() => setCalculateDialogOpen(false)}>
        <DialogTitle>給与計算の実行</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedYear}年{selectedMonth}月の給与計算を実行します。
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            ※ 既に作成済みの給与明細（作成中状態）は更新されます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalculateDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleCalculate} variant="contained">
            実行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 確定ダイアログ */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>給与明細の確定</DialogTitle>
        <DialogContent>
          <Typography>
            選択した{draftPayslips.length}件の給与明細を確定します。
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            ※ 確定後は編集できなくなります。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleConfirm} variant="contained">
            確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 支払記録ダイアログ */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>支払い記録</DialogTitle>
        <DialogContent>
          <Typography>
            選択した{confirmedPayslips.length}件の給与を支払済みとして記録します。
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel shrink>支払日</InputLabel>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={{
                padding: "8px",
                fontSize: "16px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handlePayment} variant="contained">
            記録
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PayslipManagementPage;