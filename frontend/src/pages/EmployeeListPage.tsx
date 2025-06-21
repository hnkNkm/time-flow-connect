import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeAPI } from "../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TablePagination,
  Grid,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  PowerSettingsNew as PowerIcon,
} from "@mui/icons-material";

interface Employee {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  employee_code?: string;
  department?: {
    id: number;
    name: string;
  };
  position?: string;
  employment_type: string;
  hire_date?: string;
  hourly_rate: number;
  monthly_salary?: number;
  phone_number?: string;
}

const EmployeeListPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // フィルタと検索
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);
  
  // ページネーション
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, [page, rowsPerPage, search, employmentType, isActiveFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page: page + 1,
        per_page: rowsPerPage,
      };
      
      if (search) params.search = search;
      if (employmentType) params.employment_type = employmentType;
      if (isActiveFilter !== null) params.is_active = isActiveFilter;
      
      const response = await employeeAPI.getEmployees(params);
      setEmployees(response.data.items);
      setTotalCount(response.data.total);
    } catch (err: any) {
      console.error("社員一覧取得エラー:", err);
      setError("社員一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      const response = await employeeAPI.toggleEmployeeActive(employee.id);
      // 一覧を再取得
      fetchEmployees();
    } catch (err: any) {
      console.error("ステータス変更エラー:", err);
      alert("ステータスの変更に失敗しました");
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      full_time: "正社員",
      part_time: "パート",
      contract: "契約社員",
      intern: "インターン",
    };
    return labels[type] || type;
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "管理者" : "一般";
  };

  return (
    <div className="employee-list-page">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <h2>社員管理</h2>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/employees/new")}
        >
          新規登録
        </Button>
      </Box>

      {/* フィルタ */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="検索（名前・メール・社員コード）"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>雇用形態</InputLabel>
              <Select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                label="雇用形態"
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="full_time">正社員</MenuItem>
                <MenuItem value="part_time">パート</MenuItem>
                <MenuItem value="contract">契約社員</MenuItem>
                <MenuItem value="intern">インターン</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>ステータス</InputLabel>
              <Select
                value={isActiveFilter === null ? "" : isActiveFilter.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setIsActiveFilter(value === "" ? null : value === "true");
                }}
                label="ステータス"
              >
                <MenuItem value="">すべて</MenuItem>
                <MenuItem value="true">有効</MenuItem>
                <MenuItem value="false">無効</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearch("");
                setEmploymentType("");
                setIsActiveFilter(null);
              }}
            >
              クリア
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>社員コード</TableCell>
                  <TableCell>氏名</TableCell>
                  <TableCell>メールアドレス</TableCell>
                  <TableCell>部署</TableCell>
                  <TableCell>役職</TableCell>
                  <TableCell>雇用形態</TableCell>
                  <TableCell>時給</TableCell>
                  <TableCell>権限</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.id}</TableCell>
                    <TableCell>{employee.employee_code || "-"}</TableCell>
                    <TableCell>{employee.full_name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.department?.name || "-"}</TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={getEmploymentTypeLabel(employee.employment_type)}
                        size="small"
                        color={employee.employment_type === "full_time" ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell>¥{employee.hourly_rate.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(employee.role)}
                        size="small"
                        color={employee.role === "admin" ? "secondary" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={employee.is_active ? "有効" : "無効"}
                        size="small"
                        color={employee.is_active ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={employee.is_active ? "無効化" : "有効化"}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(employee)}
                          color={employee.is_active ? "error" : "success"}
                        >
                          <PowerIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`
            }
          />
        </>
      )}
    </div>
  );
};

export default EmployeeListPage;