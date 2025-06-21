import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { attendanceApi, shiftsApi } from "../api/client";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Box,
  Chip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  Schedule as AttendanceIcon,
  EventNote as ShiftIcon,
  Receipt as PayslipIcon,
} from "@mui/icons-material";

interface Notification {
  id: string;
  type: "attendance" | "shift" | "leave" | "payslip";
  title: string;
  message: string;
  link?: string;
  createdAt: Date;
  read: boolean;
}

// 通知の既読状態を保存
const getReadNotifications = (): string[] => {
  const stored = localStorage.getItem("readNotifications");
  return stored ? JSON.parse(stored) : [];
};

const markNotificationAsRead = (notificationId: string) => {
  const readIds = getReadNotifications();
  if (!readIds.includes(notificationId)) {
    readIds.push(notificationId);
    localStorage.setItem("readNotifications", JSON.stringify(readIds));
  }
};

const NotificationBadge: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // 5分ごとに通知をチェック
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    const newNotifications: Notification[] = [];

    try {
      if (isAdmin) {
        // 管理者向け通知
        // 承認待ちの打刻修正申請をチェック
        const adjustmentRequests = await attendanceApi.getAdjustmentRequestsAdminApiAttendanceAdminAdjustmentRequestsGet();
        const pendingAdjustments = adjustmentRequests.data?.filter(
          (req: any) => req.status === "pending"
        ) || [];
        
        if (pendingAdjustments.length > 0) {
          newNotifications.push({
            id: "adj-pending",
            type: "attendance",
            title: "打刻修正申請",
            message: `${pendingAdjustments.length}件の承認待ち`,
            link: "/attendance/adjustments",
            createdAt: new Date(),
            read: false,
          });
        }

        // 承認待ちのシフトをチェック
        const shifts = await shiftsApi.getAllShiftsApiShiftsAdminAllShiftsGet();
        const pendingShifts = shifts.data?.filter(
          (shift: any) => shift.status === "pending"
        ) || [];

        if (pendingShifts.length > 0) {
          newNotifications.push({
            id: "shift-pending",
            type: "shift",
            title: "シフト申請",
            message: `${pendingShifts.length}件の承認待ち`,
            link: "/shift",
            createdAt: new Date(),
            read: false,
          });
        }
      } else {
        // 一般ユーザー向け通知
        // 自分のシフトステータスをチェック
        try {
          const myShifts = await shiftsApi.getMyShiftsApiShiftsMyShiftsGet();
          const recentShifts = myShifts.data?.filter((shift: any) => {
            const updatedAt = new Date(shift.updated_at);
            const daysDiff = (new Date().getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7; // 7日以内の更新
          }) || [];

          recentShifts.forEach((shift: any) => {
            if (shift.status === "confirmed") {
              newNotifications.push({
                id: `shift-confirmed-${shift.id}`,
                type: "shift",
                title: "シフト承認",
                message: `${new Date(shift.date).toLocaleDateString("ja-JP")}のシフトが承認されました`,
                link: "/shift",
                createdAt: new Date(shift.updated_at),
                read: false,
              });
            } else if (shift.status === "rejected") {
              newNotifications.push({
                id: `shift-rejected-${shift.id}`,
                type: "shift",
                title: "シフト却下",
                message: `${new Date(shift.date).toLocaleDateString("ja-JP")}のシフトが却下されました`,
                link: "/shift",
                createdAt: new Date(shift.updated_at),
                read: false,
              });
            }
          });
        } catch (error) {
          console.error("シフト通知の取得に失敗:", error);
        }

        // 打刻修正申請のステータスをチェック
        try {
          const myAdjustments = await attendanceApi.getMyAdjustmentRequestsApiAttendanceMyAdjustmentRequestsGet();
          const recentAdjustments = myAdjustments.data?.filter((req: any) => {
            const updatedAt = new Date(req.updated_at);
            const daysDiff = (new Date().getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7 && req.status !== "pending";
          }) || [];

          recentAdjustments.forEach((req: any) => {
            if (req.status === "approved") {
              newNotifications.push({
                id: `adj-approved-${req.id}`,
                type: "attendance",
                title: "打刻修正承認",
                message: `${new Date(req.request_date).toLocaleDateString("ja-JP")}の打刻修正が承認されました`,
                link: "/attendance/list",
                createdAt: new Date(req.updated_at),
                read: false,
              });
            } else if (req.status === "rejected") {
              newNotifications.push({
                id: `adj-rejected-${req.id}`,
                type: "attendance",
                title: "打刻修正却下",
                message: `${new Date(req.request_date).toLocaleDateString("ja-JP")}の打刻修正が却下されました`,
                link: "/attendance/list",
                createdAt: new Date(req.updated_at),
                read: false,
              });
            }
          });
        } catch (error) {
          console.error("打刻修正通知の取得に失敗:", error);
        }

        // パスワード変更通知（ローカルストレージから確認）
        const passwordChangedAt = localStorage.getItem("passwordChangedAt");
        if (passwordChangedAt) {
          const changedDate = new Date(passwordChangedAt);
          const daysDiff = (new Date().getTime() - changedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff <= 1) {
            newNotifications.push({
              id: "password-changed",
              type: "attendance",
              title: "パスワード変更完了",
              message: "パスワードが正常に変更されました",
              createdAt: changedDate,
              read: false,
            });
          }
        }
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error("通知の取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
    handleClose();
    // 通知を既読にする
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "attendance":
        return <AttendanceIcon fontSize="small" />;
      case "shift":
        return <ShiftIcon fontSize="small" />;
      case "payslip":
        return <PayslipIcon fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6">通知</Typography>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="textSecondary">
              新しい通知はありません
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                py: 2,
                px: 2,
                borderBottom: 1,
                borderColor: "divider",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
                <Box sx={{ mr: 2, mt: 0.5 }}>{getIcon(notification.type)}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                    {notification.createdAt.toLocaleString("ja-JP")}
                  </Typography>
                </Box>
                {!notification.read && (
                  <Chip
                    label="新着"
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </MenuItem>
          ))
        )}

        {notifications.length > 0 && (
          <Box sx={{ p: 1, textAlign: "center" }}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: "pointer" }}
              onClick={() => {
                // すべての通知を既読にする処理
                notifications.forEach(n => markNotificationAsRead(n.id));
                setNotifications(notifications.map(n => ({ ...n, read: true })));
                handleClose();
              }}
            >
              すべて既読にする
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBadge;