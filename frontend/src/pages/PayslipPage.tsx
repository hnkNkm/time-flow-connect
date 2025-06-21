import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { payslipAPI } from "../services/api";
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
} from "@mui/material";
import {
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
} from "@mui/icons-material";

interface Payslip {
  id: number;
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

const PayslipPage: React.FC = () => {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPayslips();
  }, [selectedYear]);

  const fetchPayslips = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await payslipAPI.getMyPayslips({ year: selectedYear });
      setPayslips(response.data.items);
    } catch (err: any) {
      console.error("給与明細取得エラー:", err);
      setError("給与明細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
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

  const handleView = (year: number, month: number) => {
    navigate(`/payslips/${year}/${month}`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="payslip-page">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h2>給与明細</h2>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>年度</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            label="年度"
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}年
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

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
          <p>給与明細がありません</p>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>年月</TableCell>
                <TableCell align="right">出勤日数</TableCell>
                <TableCell align="right">総労働時間</TableCell>
                <TableCell align="right">総支給額</TableCell>
                <TableCell align="right">差引支給額</TableCell>
                <TableCell>状態</TableCell>
                <TableCell>確定日</TableCell>
                <TableCell>支払日</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payslips.map((payslip) => (
                <TableRow key={payslip.id}>
                  <TableCell>
                    {payslip.year}年{payslip.month}月
                  </TableCell>
                  <TableCell align="right">{payslip.work_days}日</TableCell>
                  <TableCell align="right">
                    {payslip.total_hours.toFixed(1)}時間
                  </TableCell>
                  <TableCell align="right">
                    ¥{payslip.gross_salary.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ¥{payslip.net_salary.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusChip(payslip.status)}</TableCell>
                  <TableCell>
                    {payslip.confirmed_at
                      ? new Date(payslip.confirmed_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {payslip.paid_at
                      ? new Date(payslip.paid_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleView(payslip.year, payslip.month)}
                    >
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default PayslipPage;