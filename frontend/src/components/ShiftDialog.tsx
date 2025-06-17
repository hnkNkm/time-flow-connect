import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

interface ShiftDialogProps {
  open: boolean;
  title: string;
  contentText: string;
  mode: "view" | "register" | "approve" | "reject";
  formData?: {
    date?: string;
    start_time?: string;
    end_time?: string;
    break_time?: number;
    memo?: string;
  };
  shiftId?: number;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, formData?: any) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  useDateTime?: boolean;
  selectedDates?: Date[];
}

const ShiftDialog: React.FC<ShiftDialogProps> = ({
  open,
  title,
  contentText,
  mode,
  formData = {},
  onClose,
  onSubmit,
  onApprove,
  onReject,
  onChange,
  useDateTime = false,
  selectedDates,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{contentText}</DialogContentText>

        {mode === "register" && onChange && (
          <form id="shift-form" className="shift-form">
            <div className="form-group">
              <label htmlFor="start_time">
                {selectedDates && selectedDates.length > 1 ? "開始時間（各日共通）" : "開始時間"}
              </label>
              <input
                type={useDateTime ? "datetime-local" : "time"}
                id="start_time"
                name="start_time"
                value={formData.start_time || ""}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_time">
                {selectedDates && selectedDates.length > 1 ? "終了時間（各日共通）" : "終了時間"}
                {selectedDates && selectedDates.length > 1 && (
                  <small style={{ display: "block", marginTop: "4px", color: "#666" }}>
                    ※ 日をまたぐ場合は翌日の時間として登録されます
                  </small>
                )}
              </label>
              <input
                type={useDateTime ? "datetime-local" : "time"}
                id="end_time"
                name="end_time"
                value={formData.end_time || ""}
                onChange={onChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="break_time">休憩時間（分）</label>
              <select
                id="break_time"
                name="break_time"
                value={formData.break_time || 60}
                onChange={onChange}
              >
                <option value={0}>0分</option>
                <option value={30}>30分</option>
                <option value={45}>45分</option>
                <option value={60}>60分</option>
                <option value={90}>90分</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="memo">メモ</label>
              <textarea
                id="memo"
                name="memo"
                rows={3}
                value={formData.memo || ""}
                onChange={onChange}
              />
            </div>
          </form>
        )}
      </DialogContent>
      <DialogActions>
        {mode === "view" && (
          <Button onClick={onClose} color="primary">
            閉じる
          </Button>
        )}

        {mode === "register" && (
          <>
            <Button onClick={onClose} color="secondary">
              キャンセル
            </Button>
            <Button
              onClick={(e) => onSubmit(e, formData)}
              color="primary"
              variant="contained"
              form="shift-form"
              type="submit"
            >
              登録
            </Button>
          </>
        )}

        {mode === "approve" && (
          <>
            <Button onClick={onClose} color="secondary">
              キャンセル
            </Button>
            <Button onClick={onApprove} color="primary" variant="contained">
              承認
            </Button>
          </>
        )}

        {mode === "reject" && (
          <>
            <Button onClick={onClose} color="secondary">
              キャンセル
            </Button>
            <Button onClick={onReject} color="error" variant="contained">
              却下
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShiftDialog;
