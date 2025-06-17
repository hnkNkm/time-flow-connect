import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

interface EstimatedSalaryData {
  year: number;
  month: number;
  user_id: number;
  user_name: string;
  confirmed_shifts_count: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  regular_pay: number;
  overtime_pay: number;
  estimated_salary: number;
}

interface EstimatedSalaryProps {
  data: EstimatedSalaryData | null;
}

const EstimatedSalary: React.FC<EstimatedSalaryProps> = ({ data }) => {
  if (!data || data.confirmed_shifts_count === 0) {
    return (
      <Card className="estimated-salary">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            シフトベース見込み給与
          </Typography>
          <Typography color="textSecondary">
            確定済みシフトがありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="estimated-salary">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" gutterBottom>
            シフトベース見込み給与
          </Typography>
          <Chip 
            label={`確定シフト: ${data.confirmed_shifts_count}日`} 
            color="primary" 
            size="small" 
          />
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              予定勤務時間
            </Typography>
            <Typography variant="h5">
              {data.total_hours.toFixed(1)}時間
            </Typography>
            <Typography variant="caption" color="textSecondary">
              （通常: {data.regular_hours.toFixed(1)}時間 / 残業: {data.overtime_hours.toFixed(1)}時間）
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              時給
            </Typography>
            <Typography variant="h5">
              ¥{data.hourly_rate.toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              基本給
            </Typography>
            <Typography variant="body1">
              ¥{data.regular_pay.toLocaleString()}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              残業手当
            </Typography>
            <Typography variant="body1">
              ¥{data.overtime_pay.toLocaleString()}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              見込み総額
            </Typography>
            <Typography variant="h5" color="primary">
              ¥{data.estimated_salary.toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            ※ この金額は確定済みシフトに基づく見込み金額です。実際の勤怠記録により変動する可能性があります。
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EstimatedSalary;