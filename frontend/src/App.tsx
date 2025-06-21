import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import AttendanceFormPage from "./pages/AttendanceFormPage";
import AttendanceListPage from "./pages/AttendanceListPage";
import MonthlyAttendancePage from "./pages/MonthlyAttendancePage";
import TeamMonthlyAttendancePage from "./pages/TeamMonthlyAttendancePage";
import ShiftManagementPage from "./pages/ShiftManagementPage";
import EmployeeListPage from "./pages/EmployeeListPage";
import EmployeeDetailPage from "./pages/EmployeeDetailPage";
import PayslipPage from "./pages/PayslipPage";
import PayslipDetailPage from "./pages/PayslipDetailPage";
import PayslipManagementPage from "./pages/PayslipManagementPage";
import LeaveRequestPage from "./pages/LeaveRequestPage";
import NotFoundPage from "./pages/NotFoundPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";
import "./styles/estimatedSalary.css";
import "./styles/payslip.css";
import "./styles/responsive.css";

// プライベートルート（認証が必要なルート）
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// 管理者専用ルート
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/attendance/form" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 認証ページ */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ダッシュボードページ（認証が必要） */}
          <Route
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance/form" element={<AttendanceFormPage />} />
            <Route path="/attendance/list" element={<AttendanceListPage />} />
            <Route
              path="/attendance/monthly"
              element={<MonthlyAttendancePage />}
            />
            <Route path="/shift" element={<ShiftManagementPage />} />
            <Route path="/leave" element={<LeaveRequestPage />} />
            <Route path="/payslips" element={<PayslipPage />} />
            <Route path="/payslips/:year/:month" element={<PayslipDetailPage />} />

            {/* 管理者専用ページ */}
            <Route
              path="/team/monthly"
              element={
                <AdminRoute>
                  <TeamMonthlyAttendancePage />
                </AdminRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <AdminRoute>
                  <EmployeeListPage />
                </AdminRoute>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <PrivateRoute>
                  <EmployeeDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/payslips/management"
              element={
                <AdminRoute>
                  <PayslipManagementPage />
                </AdminRoute>
              }
            />
          </Route>

          {/* 404ページ */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
