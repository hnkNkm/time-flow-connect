import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 認証エラー時の処理
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      // ウィンドウをリロードして認証状態をリセット
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const fetchHello = async () => {
  const response = await api.get("/api/hello");
  return response.data;
};

export interface AttendanceData {
  employee_name: string;
  check_in_time: string;
  memo?: string;
}

export interface AttendanceRecord extends AttendanceData {
  id: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message: string;
}

export const createAttendance = async (
  data: AttendanceData
): Promise<ApiResponse<AttendanceRecord>> => {
  const response = await api.post("/api/attendance", data);
  return response.data;
};

export const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
  const response = await api.get("/api/attendance");
  return response.data;
};

export default api;

// 認証関連のAPI
export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    return api.post("/api/auth/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  getMe: async () => {
    return api.get("/api/auth/me");
  },
};

// 勤怠関連のAPI
export const attendanceAPI = {
  checkIn: async (data: any) => {
    return api.post("/api/attendance/check-in", data);
  },

  checkOut: async (id: number, data: any) => {
    return api.put(`/api/attendance/check-out/${id}`, data);
  },

  getMyRecords: async (params?: { start_date?: string; end_date?: string }) => {
    return api.get("/api/attendance/my-records", { params });
  },

  getMyMonthlyRecords: async (year: number, month: number) => {
    return api.get("/api/attendance/my-monthly-records", {
      params: { year, month },
    });
  },

  getAllRecords: async (params?: {
    start_date?: string;
    end_date?: string;
    user_id?: number;
  }) => {
    return api.get("/api/attendance/all-records", { params });
  },

  getMonthlyStats: async (year: number, month: number) => {
    return api.get("/api/attendance/monthly-stats", {
      params: { year, month },
    });
  },
};

// シフト関連のAPI
export const shiftAPI = {
  registerShift: async (data: any) => {
    return api.post("/api/shifts", data);
  },

  bulkRegisterShifts: async (data: any) => {
    return api.post("/api/shifts/bulk", data);
  },

  updateShift: async (id: number, data: any) => {
    return api.put(`/api/shifts/${id}`, data);
  },

  getMyShifts: async (params?: { start_date?: string; end_date?: string; status?: string; sort_order?: string }) => {
    return api.get("/api/shifts/my-shifts", { params });
  },

  getAllShifts: async (params?: {
    start_date?: string;
    end_date?: string;
    user_id?: number;
    status?: string;
    sort_order?: string;
  }) => {
    return api.get("/api/shifts/admin/all-shifts", { params });
  },

  getDailySchedule: async (date: string) => {
    return api.get(`/api/shifts/daily-schedule/${date}`);
  },

  getWeeklySchedule: async (start_date: string) => {
    return api.get("/api/shifts/weekly-schedule", { params: { start_date } });
  },

  approveShift: async (id: number) => {
    return api.put(`/api/shifts/${id}/approve`);
  },

  rejectShift: async (id: number) => {
    return api.put(`/api/shifts/${id}/reject`);
  },

  deleteShift: async (id: number) => {
    return api.delete(`/api/shifts/${id}`);
  },

  bulkApproveShifts: async (data: { shifts: number[]; status: string; admin_comment?: string }) => {
    return api.put("/api/shifts/admin/confirm", data);
  },

  getEstimatedSalary: async (year: number, month: number, userId?: number) => {
    const params = userId ? { user_id: userId } : {};
    return api.get(`/api/shifts/estimated-salary/${year}/${month}`, { params });
  },
};

// 社員管理関連のAPI
export const employeeAPI = {
  getEmployees: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    department_id?: number;
    employment_type?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: string;
  }) => {
    return api.get("/api/employees", { params });
  },

  getEmployee: async (id: number) => {
    return api.get(`/api/employees/${id}`);
  },

  createEmployee: async (data: any) => {
    return api.post("/api/employees", data);
  },

  updateEmployee: async (id: number, data: any) => {
    return api.put(`/api/employees/${id}`, data);
  },

  toggleEmployeeActive: async (id: number) => {
    return api.put(`/api/employees/${id}/toggle-active`);
  },

  changePassword: async (data: { current_password: string; new_password: string }) => {
    return api.post("/api/employees/password/change", data);
  },

  resetPassword: async (data: { user_id: number; new_password: string }) => {
    return api.post("/api/employees/password/reset", data);
  },
};

// 給与明細関連のAPI
export const payslipAPI = {
  getMyPayslips: async (params?: { year?: number; status?: string }) => {
    return api.get("/api/payslips/my-payslips", { params });
  },

  getMyPayslip: async (year: number, month: number) => {
    return api.get(`/api/payslips/my-payslips/${year}/${month}`);
  },

  getAllPayslips: async (params?: { 
    year?: number; 
    month?: number; 
    user_id?: number; 
    status?: string 
  }) => {
    return api.get("/api/payslips/admin", { params });
  },

  calculatePayslips: async (data: { 
    year: number; 
    month: number; 
    user_ids?: number[] 
  }) => {
    return api.post("/api/payslips/admin/calculate", data);
  },

  updatePayslip: async (id: number, data: any) => {
    return api.put(`/api/payslips/${id}`, data);
  },

  confirmPayslips: async (payslip_ids: number[]) => {
    return api.post("/api/payslips/admin/confirm", { payslip_ids });
  },

  recordPayment: async (data: { 
    payslip_ids: number[]; 
    payment_date: string 
  }) => {
    return api.post("/api/payslips/admin/payment", data);
  },
};
