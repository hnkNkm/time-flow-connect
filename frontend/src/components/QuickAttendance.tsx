import React, { useState, useEffect } from "react";
import { attendanceApi } from "../api/client";
import { SrcSchemasAttendanceAttendanceResponse } from "../api/generated";
import {
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Login as CheckInIcon,
  Logout as CheckOutIcon,
} from "@mui/icons-material";

interface QuickAttendanceProps {
  onSuccess?: () => void;
  variant?: "button" | "icon";
}

const QuickAttendance: React.FC<QuickAttendanceProps> = ({ 
  onSuccess, 
  variant = "button" 
}) => {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<SrcSchemasAttendanceAttendanceResponse | null>(null);
  const [message, setMessage] = useState<{ text: string; severity: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const records = await attendanceApi.getMyAttendanceRecordsApiAttendanceMyRecordsGet(today, today);
      if (records.data && records.data.length > 0) {
        setTodayAttendance(records.data[0]);
      }
    } catch (error) {
      console.error("勤怠記録の取得に失敗しました:", error);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await attendanceApi.checkInApiAttendanceCheckInPost({
        memo: "クイック出勤",
      });
      setMessage({ text: "出勤しました", severity: "success" });
      await fetchTodayAttendance();
      if (onSuccess) onSuccess();
    } catch (error) {
      setMessage({ text: "出勤処理に失敗しました", severity: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance?.id) return;
    
    setLoading(true);
    try {
      await attendanceApi.checkOutApiAttendanceCheckOutAttendanceIdPut(
        todayAttendance.id,
        {
          memo: "クイック退勤",
        }
      );
      setMessage({ text: "退勤しました", severity: "success" });
      await fetchTodayAttendance();
      if (onSuccess) onSuccess();
    } catch (error) {
      setMessage({ text: "退勤処理に失敗しました", severity: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isCheckedIn = todayAttendance && !todayAttendance.check_out_time;
  const isCompleted = todayAttendance?.check_out_time;

  if (loading) {
    return <CircularProgress size={24} />;
  }

  if (variant === "icon") {
    if (isCompleted) {
      return (
        <Tooltip title="本日の勤務は完了しています">
          <span>
            <IconButton disabled>
              <CheckOutIcon />
            </IconButton>
          </span>
        </Tooltip>
      );
    }

    return (
      <Tooltip title={isCheckedIn ? "退勤する" : "出勤する"}>
        <IconButton
          color="inherit"
          onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
          disabled={loading}
        >
          {isCheckedIn ? <CheckOutIcon /> : <CheckInIcon />}
        </IconButton>
      </Tooltip>
    );
  }

  if (isCompleted) {
    return (
      <Button variant="outlined" disabled startIcon={<CheckOutIcon />}>
        勤務完了
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        color={isCheckedIn ? "error" : "primary"}
        onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
        disabled={loading}
        startIcon={isCheckedIn ? <CheckOutIcon /> : <CheckInIcon />}
      >
        {isCheckedIn ? "退勤" : "出勤"}
      </Button>

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {message && (
          <Alert
            onClose={() => setMessage(null)}
            severity={message.severity}
            sx={{ width: "100%" }}
          >
            {message.text}
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

export default QuickAttendance;