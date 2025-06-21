import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Paper,
  Tabs,
  Tab,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
} from "@mui/icons-material";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isNewEmployee = id === "new";
  const isAdmin = currentUser?.role === "admin";
  const isSelf = currentUser?.id === parseInt(id || "0");

  const [loading, setLoading] = useState(!isNewEmployee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // フォームデータ
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    role: "employee",
    is_active: true,
    password: "",
    employee_code: "",
    department_id: "",
    position: "",
    employment_type: "full_time",
    hire_date: "",
    hourly_rate: 1000,
    monthly_salary: "",
    payment_method: "bank_transfer",
    phone_number: "",
    emergency_contact: "",
    emergency_phone: "",
    address: "",
  });

  // パスワードリセット用
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!isNewEmployee && id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const response = await employeeAPI.getEmployee(parseInt(id!));
      const employee = response.data;
      
      setFormData({
        username: employee.username,
        email: employee.email,
        full_name: employee.full_name,
        role: employee.role,
        is_active: employee.is_active,
        password: "",
        employee_code: employee.employee_code || "",
        department_id: employee.department_id || "",
        position: employee.position || "",
        employment_type: employee.employment_type,
        hire_date: employee.hire_date || "",
        hourly_rate: employee.hourly_rate,
        monthly_salary: employee.monthly_salary || "",
        payment_method: employee.payment_method,
        phone_number: employee.phone_number || "",
        emergency_contact: employee.emergency_contact || "",
        emergency_phone: employee.emergency_phone || "",
        address: employee.address || "",
      });
    } catch (err: any) {
      console.error("社員情報取得エラー:", err);
      setError("社員情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const dataToSend: any = { ...formData };
      
      // 新規登録時のみパスワードを送信
      if (!isNewEmployee) {
        delete dataToSend.password;
      }
      
      // 空文字列をnullに変換
      Object.keys(dataToSend).forEach((key) => {
        if (dataToSend[key] === "") {
          dataToSend[key] = null;
        }
      });

      if (isNewEmployee) {
        await employeeAPI.createEmployee(dataToSend);
        setSuccessMessage("社員を登録しました");
        setTimeout(() => navigate("/employees"), 1500);
      } else {
        await employeeAPI.updateEmployee(parseInt(id!), dataToSend);
        setSuccessMessage("社員情報を更新しました");
      }
    } catch (err: any) {
      console.error("保存エラー:", err);
      setError(err.response?.data?.detail || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword) {
      setError("新しいパスワードを入力してください");
      return;
    }

    try {
      await employeeAPI.resetPassword({
        user_id: parseInt(id!),
        new_password: newPassword,
      });
      setSuccessMessage("パスワードをリセットしました");
      setPasswordDialogOpen(false);
      setNewPassword("");
    } catch (err: any) {
      console.error("パスワードリセットエラー:", err);
      setError(err.response?.data?.detail || "パスワードリセットに失敗しました");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="employee-detail-page">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h2>{isNewEmployee ? "社員新規登録" : "社員詳細・編集"}</h2>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Paper>
        <form onSubmit={handleSubmit}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="基本情報" />
            <Tab label="給与情報" />
            <Tab label="連絡先" />
            {!isNewEmployee && isAdmin && <Tab label="セキュリティ" />}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ユーザー名"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  required
                  disabled={!isNewEmployee}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  disabled={!isAdmin}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="氏名"
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                  disabled={!isAdmin}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="社員コード"
                  value={formData.employee_code}
                  onChange={(e) => handleChange("employee_code", e.target.value)}
                  disabled={!isAdmin}
                />
              </Grid>
              
              {isNewEmployee && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="初期パスワード"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    helperText="初回ログイン時に変更が必要です"
                  />
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isAdmin}>
                  <InputLabel>権限</InputLabel>
                  <Select
                    value={formData.role}
                    onChange={(e) => handleChange("role", e.target.value)}
                    label="権限"
                  >
                    <MenuItem value="employee">一般</MenuItem>
                    <MenuItem value="admin">管理者</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="役職"
                  value={formData.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                  disabled={!isAdmin}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isAdmin}>
                  <InputLabel>雇用形態</InputLabel>
                  <Select
                    value={formData.employment_type}
                    onChange={(e) => handleChange("employment_type", e.target.value)}
                    label="雇用形態"
                  >
                    <MenuItem value="full_time">正社員</MenuItem>
                    <MenuItem value="part_time">パート</MenuItem>
                    <MenuItem value="contract">契約社員</MenuItem>
                    <MenuItem value="intern">インターン</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="入社日"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleChange("hire_date", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={!isAdmin}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="時給"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => handleChange("hourly_rate", parseInt(e.target.value))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                  }}
                  disabled={!isAdmin}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="月給"
                  type="number"
                  value={formData.monthly_salary}
                  onChange={(e) => handleChange("monthly_salary", e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                  }}
                  disabled={!isAdmin}
                  helperText="月給制の場合のみ入力"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isAdmin}>
                  <InputLabel>支払い方法</InputLabel>
                  <Select
                    value={formData.payment_method}
                    onChange={(e) => handleChange("payment_method", e.target.value)}
                    label="支払い方法"
                  >
                    <MenuItem value="bank_transfer">銀行振込</MenuItem>
                    <MenuItem value="cash">現金</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="電話番号"
                  value={formData.phone_number}
                  onChange={(e) => handleChange("phone_number", e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="緊急連絡先"
                  value={formData.emergency_contact}
                  onChange={(e) => handleChange("emergency_contact", e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="緊急連絡先電話番号"
                  value={formData.emergency_phone}
                  onChange={(e) => handleChange("emergency_phone", e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="住所"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {!isNewEmployee && isAdmin && (
            <TabPanel value={tabValue} index={3}>
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  パスワードリセット
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  ユーザーのパスワードをリセットできます。リセット後、ユーザーは初回ログイン時にパスワード変更が必要になります。
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => setPasswordDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  パスワードをリセット
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box>
                <Typography variant="h6" gutterBottom>
                  アカウント状態
                </Typography>
                <FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={(e) => handleChange("is_active", e.target.checked)}
                      />
                    }
                    label={formData.is_active ? "有効" : "無効"}
                  />
                </FormControl>
              </Box>
            </TabPanel>
          )}

          <Divider />

          <Box sx={{ p: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate("/employees")}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* パスワードリセットダイアログ */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
        <DialogTitle>パスワードリセット</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="新しいパスワード"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            helperText="8文字以上で入力してください"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handlePasswordReset} variant="contained">
            リセット
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmployeeDetailPage;