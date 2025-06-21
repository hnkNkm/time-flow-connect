import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { payslipAPI } from "../services/api";
import {
  Paper,
  Grid,
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon,
} from "@mui/icons-material";

interface PayslipDetail {
  id: number;
  user_name: string;
  employee_code?: string;
  department_name?: string;
  year: number;
  month: number;
  
  // 勤怠情報
  work_days: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  late_night_hours: number;
  holiday_hours: number;
  
  // 支給項目
  base_salary: number;
  overtime_pay: number;
  late_night_pay: number;
  holiday_pay: number;
  other_allowances: number;
  gross_salary: number;
  
  // 控除項目
  health_insurance: number;
  pension: number;
  employment_insurance: number;
  income_tax: number;
  resident_tax: number;
  other_deductions: number;
  total_deductions: number;
  
  // 差引支給額
  net_salary: number;
  
  status: string;
  confirmed_at?: string;
  paid_at?: string;
}

const PayslipDetailPage: React.FC = () => {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (year && month) {
      fetchPayslipDetail();
    }
  }, [year, month]);

  const fetchPayslipDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await payslipAPI.getMyPayslip(
        parseInt(year!),
        parseInt(month!)
      );
      setPayslip(response.data);
    } catch (err: any) {
      console.error("給与明細詳細取得エラー:", err);
      setError("給与明細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !payslip) {
    return (
      <Box p={3}>
        <Alert severity="error">{error || "給与明細が見つかりません"}</Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/payslips")}
          sx={{ mt: 2 }}
        >
          戻る
        </Button>
      </Box>
    );
  }

  return (
    <div className="payslip-detail-page">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h2>
          {payslip.year}年{payslip.month}月 給与明細
        </h2>
        <Box>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate("/payslips")}
            sx={{ mr: 1 }}
          >
            戻る
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            印刷
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }} className="payslip-detail">
        {/* ヘッダー情報 */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              氏名
            </Typography>
            <Typography variant="h6">{payslip.user_name}</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">
              社員コード
            </Typography>
            <Typography>{payslip.employee_code || "-"}</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="subtitle2" color="textSecondary">
              所属部署
            </Typography>
            <Typography>{payslip.department_name || "-"}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* 勤怠情報 */}
        <Typography variant="h6" gutterBottom>
          勤怠情報
        </Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>出勤日数</TableCell>
                <TableCell align="right">{payslip.work_days}日</TableCell>
                <TableCell>総労働時間</TableCell>
                <TableCell align="right">
                  {payslip.total_hours.toFixed(1)}時間
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>通常勤務時間</TableCell>
                <TableCell align="right">
                  {payslip.regular_hours.toFixed(1)}時間
                </TableCell>
                <TableCell>残業時間</TableCell>
                <TableCell align="right">
                  {payslip.overtime_hours.toFixed(1)}時間
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>深夜勤務時間</TableCell>
                <TableCell align="right">
                  {payslip.late_night_hours.toFixed(1)}時間
                </TableCell>
                <TableCell>休日勤務時間</TableCell>
                <TableCell align="right">
                  {payslip.holiday_hours.toFixed(1)}時間
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        {/* 支給・控除 */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              支給
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>基本給</TableCell>
                    <TableCell align="right">
                      ¥{payslip.base_salary.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>残業手当</TableCell>
                    <TableCell align="right">
                      ¥{payslip.overtime_pay.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>深夜手当</TableCell>
                    <TableCell align="right">
                      ¥{payslip.late_night_pay.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>休日手当</TableCell>
                    <TableCell align="right">
                      ¥{payslip.holiday_pay.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  {payslip.other_allowances > 0 && (
                    <TableRow>
                      <TableCell>その他手当</TableCell>
                      <TableCell align="right">
                        ¥{payslip.other_allowances.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>
                      <strong>総支給額</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>¥{payslip.gross_salary.toLocaleString()}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              控除
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>健康保険料</TableCell>
                    <TableCell align="right">
                      ¥{payslip.health_insurance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>厚生年金</TableCell>
                    <TableCell align="right">
                      ¥{payslip.pension.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>雇用保険</TableCell>
                    <TableCell align="right">
                      ¥{payslip.employment_insurance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>所得税</TableCell>
                    <TableCell align="right">
                      ¥{payslip.income_tax.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  {payslip.resident_tax > 0 && (
                    <TableRow>
                      <TableCell>住民税</TableCell>
                      <TableCell align="right">
                        ¥{payslip.resident_tax.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                  {payslip.other_deductions > 0 && (
                    <TableRow>
                      <TableCell>その他控除</TableCell>
                      <TableCell align="right">
                        ¥{payslip.other_deductions.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell>
                      <strong>控除合計</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>¥{payslip.total_deductions.toLocaleString()}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* 差引支給額 */}
        <Box textAlign="center" py={2}>
          <Typography variant="h5" color="primary">
            差引支給額: ¥{payslip.net_salary.toLocaleString()}
          </Typography>
        </Box>

        {/* ステータス情報 */}
        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Chip
              label={
                payslip.status === "paid"
                  ? "支払済"
                  : payslip.status === "confirmed"
                  ? "確定"
                  : "作成中"
              }
              color={
                payslip.status === "paid"
                  ? "success"
                  : payslip.status === "confirmed"
                  ? "primary"
                  : "default"
              }
            />
          </Box>
          <Box textAlign="right">
            {payslip.confirmed_at && (
              <Typography variant="caption" display="block">
                確定日: {new Date(payslip.confirmed_at).toLocaleDateString()}
              </Typography>
            )}
            {payslip.paid_at && (
              <Typography variant="caption" display="block">
                支払日: {new Date(payslip.paid_at).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </div>
  );
};

export default PayslipDetailPage;