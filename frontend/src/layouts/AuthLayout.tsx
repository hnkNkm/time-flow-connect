import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/AuthLayout.css";

const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // 既に認証済みの場合はダッシュボードにリダイレクト
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-logo">
          <h1>TimeFlowConnect</h1>
          <p>勤怠管理・シフト管理システム</p>
        </div>
        <div className="auth-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
