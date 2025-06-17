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

  getMyShifts: async (params?: { start_date?: string; end_date?: string }) => {
    return api.get("/api/shifts/my-shifts", { params });
  },

  getAllShifts: async (params?: {
    start_date?: string;
    end_date?: string;
    user_id?: number;
    approved_only?: boolean;
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
};
