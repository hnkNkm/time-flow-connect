import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { authApi } from "../api/client";

interface PasswordChangeDialogProps {
  open: boolean;
  onClose: () => void;
  forceChange?: boolean;
}

const PasswordChangeDialog: React.FC<PasswordChangeDialogProps> = ({
  open,
  onClose,
  forceChange = false,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("すべての項目を入力してください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("新しいパスワードが一致しません");
      return;
    }

    if (newPassword.length < 8) {
      setError("パスワードは8文字以上で設定してください");
      return;
    }

    if (currentPassword === newPassword) {
      setError("新しいパスワードは現在のパスワードと異なるものにしてください");
      return;
    }

    setLoading(true);

    try {
      await authApi.changePasswordApiAuthChangePasswordPost({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess(true);
      
      // パスワード変更完了を記録（通知用）
      localStorage.setItem("passwordChangedAt", new Date().toISOString());

      // 成功後、2秒後にダイアログを閉じる
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      if (error.response?.status === 400) {
        setError("現在のパスワードが正しくありません");
      } else {
        setError("パスワードの変更に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!forceChange) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={forceChange}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <LockIcon sx={{ mr: 1 }} />
          パスワード変更
        </Box>
      </DialogTitle>
      <DialogContent>
        {forceChange && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            初回ログインのため、パスワードを変更する必要があります
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            パスワードが正常に変更されました
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="現在のパスワード"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading || success}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="新しいパスワード"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading || success}
            helperText="8文字以上で設定してください"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="新しいパスワード（確認）"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
            disabled={loading || success}
            error={confirmPassword !== "" && newPassword !== confirmPassword}
            helperText={
              confirmPassword !== "" && newPassword !== confirmPassword
                ? "パスワードが一致しません"
                : ""
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: "block" }}>
          ※ パスワードは定期的に変更することをお勧めします
        </Typography>
      </DialogContent>
      <DialogActions>
        {!forceChange && (
          <Button onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success}
        >
          {loading ? "変更中..." : "変更"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordChangeDialog;