import React, { useState, useEffect, useMemo } from "react";
import { SlotInfo } from "react-big-calendar";
import {
  setHours,
  setMinutes,
  addHours,
} from "date-fns";
import parse from "date-fns/parse";
import format from "date-fns/format";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

import { shiftAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { ErrorMessage, LoadingSpinner } from "../components";
import ShiftCalendar, {
  CalendarEvent,
  ShiftRecord,
} from "../components/ShiftCalendar";
import ShiftDialog from "../components/ShiftDialog";
import "../styles/shiftManagement.css";

// カレンダーイベントのスタイル設定
const eventStyleGetter = (event: CalendarEvent) => {
  const shiftStatus = event.resource.status;
  let style = {
    backgroundColor: "#3174ad",
    borderRadius: "5px",
    opacity: 0.8,
    color: "white",
    border: "0px",
    display: "block",
  };

  if (shiftStatus === "confirmed") {
    style.backgroundColor = "#28a745"; // 確定: 緑
  } else if (shiftStatus === "pending") {
    style.backgroundColor = "#ffc107"; // 保留中: 黄色
    style.color = "black";
  }

  return {
    style,
  };
};

const ShiftManagementPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [myShifts, setMyShifts] = useState<ShiftRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]); // カレンダー用イベントステート
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"my" | "all">("my"); // 表示モードの状態を追加
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false); // 登録モーダルの開閉状態
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // 削除確認ダイアログの開閉状態
  const [shiftToDelete, setShiftToDelete] = useState<number | null>(null); // 削除対象のシフトID
  const [bulkApprovalOpen, setBulkApprovalOpen] = useState(false); // 一括承認ダイアログの開閉状態
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // 一括承認対象のユーザーID

  // シフト登録フォーム用のステート
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    break_time: 60, // デフォルト60分
    memo: "",
  });
  
  // 複数日選択用のステート
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isMultiDaySelection, setIsMultiDaySelection] = useState(false);

  // 日付範囲のステート
  const [startDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });

  const [endDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  });

  // シフトデータを取得し、カレンダーイベント形式に変換
  const fetchAndSetShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      // 自分のシフトを取得
      const myResponse = await shiftAPI.getMyShifts({
        start_date: startDate,
        end_date: endDate,
      });
      setMyShifts(myResponse.data);

      // 自分のシフトをカレンダーイベントに変換
      const myEvents = myResponse.data.map(
        (shift: ShiftRecord): CalendarEvent => {
          const shiftDate = parse(shift.date, "yyyy-MM-dd", new Date());
          let startDateTime: Date;
          let endDateTime: Date;
          if (shift.start_time && shift.end_time) {
            const startTime = parse(shift.start_time, "HH:mm:ss", shiftDate);
            const endTime = parse(shift.end_time, "HH:mm:ss", shiftDate);
            startDateTime = startTime;
            endDateTime =
              endTime < startTime
                ? new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
                : endTime;
          } else {
            startDateTime = new Date(shiftDate.setHours(0, 0, 0, 0));
            endDateTime = new Date(shiftDate.setHours(23, 59, 59, 999));
          }
          const displayName = user?.full_name || "自分";
          return {
            title: `${displayName} (${shift.status})`,
            start: startDateTime,
            end: endDateTime,
            resource: { ...shift, user_full_name: displayName },
          };
        }
      );

      if (isAdmin) {
        const allResponse = await shiftAPI.getAllShifts({
          start_date: startDate,
          end_date: endDate,
        });
        setShifts(allResponse.data);
        const events = allResponse.data.map(
          (shift: ShiftRecord): CalendarEvent => {
            const shiftDate = parse(shift.date, "yyyy-MM-dd", new Date());
            let startDateTime: Date;
            let endDateTime: Date;
            if (shift.start_time && shift.end_time) {
              const startTime = parse(shift.start_time, "HH:mm:ss", shiftDate);
              const endTime = parse(shift.end_time, "HH:mm:ss", shiftDate);
              startDateTime = startTime;
              endDateTime =
                endTime < startTime
                  ? new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
                  : endTime;
            } else {
              startDateTime = new Date(shiftDate.setHours(0, 0, 0, 0));
              endDateTime = new Date(shiftDate.setHours(23, 59, 59, 999));
            }
            return {
              title: `${shift.user_full_name} (${shift.status})`,
              start: startDateTime,
              end: endDateTime,
              resource: shift,
            };
          }
        );
        setCalendarEvents(events);
      } else {
        setCalendarEvents(myEvents);
      }
    } catch (err) {
      console.error("シフトデータ取得/変換エラー:", err);
      setError(
        "シフトデータの取得またはカレンダー表示用への変換に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSetShifts();
  }, [startDate, endDate, isAdmin, user]);

  // フォーム入力の処理
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // 新しいフォームデータを作成
    const newFormData = {
      ...formData,
      [name]: value,
    };

    // 複数日選択モードの場合は時間のみ処理
    if (isMultiDaySelection) {
      // 開始時刻が変更された場合、8時間後を終了時刻に設定
      if (name === "start_time" && value) {
        const [hour, minute] = value.split(":").map(Number);
        let endHour = hour + 8;
        const endMinute = minute;
        
        // 24時間を超える場合は翌日にラップ
        if (endHour >= 24) {
          endHour = endHour - 24;
        }
        
        newFormData.end_time = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
      }
    } else {
      // 単一日選択モードの場合は従来の処理
      if (name === "start_time" && value) {
        try {
          const startDate = new Date(value);
          if (!isNaN(startDate.getTime())) {
            // 開始時刻から8時間後の日時を計算
            const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
            // YYYY-MM-DDTHH:mm 形式にフォーマット
            const formattedEndDate = format(endDate, "yyyy-MM-dd'T'HH:mm");
            // 終了時刻を更新
            newFormData.end_time = formattedEndDate;
          }
        } catch (err) {
          console.error("開始時刻の処理中にエラーが発生しました:", err);
        }
      }
    }

    setFormData(newFormData);
  };

  // シフト登録の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // エラー状態をリセット

    // フロントエンドのフォームデータからバックエンドが期待する形式に変換
    const startTimeString = formData.start_time; // "YYYY-MM-DDTHH:mm"
    const endTimeString = formData.end_time; // "YYYY-MM-DDTHH:mm"

    console.log("シフト登録開始 - フォームデータ:", formData);
    console.log("開始時刻:", startTimeString);
    console.log("終了時刻:", endTimeString);

    // 開始時刻と終了時刻のバリデーション
    try {
      if (startTimeString && endTimeString) {
        const startDateTime = new Date(startTimeString);
        const endDateTime = new Date(endTimeString);

        console.log("変換後開始時刻:", startDateTime);
        console.log("変換後終了時刻:", endDateTime);

        // 開始時刻が終了時刻より後の場合はエラー
        if (startDateTime >= endDateTime) {
          setError("終了時刻は開始時刻より後に設定してください。");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("日時の検証中にエラーが発生しました:", err);
      setError("日時のフォーマットが正しくありません。");
      setLoading(false);
      return;
    }

    // 日付と時刻を分離・整形
    const date = startTimeString ? startTimeString.split("T")[0] : null; // "YYYY-MM-DD"
    const startTime = startTimeString ? startTimeString.split("T")[1] : null; // "HH:mm"
    const endTime = endTimeString ? endTimeString.split("T")[1] : null; // "HH:mm"

    console.log("APIに送信する日付:", date);
    console.log("APIに送信する開始時刻:", startTime);
    console.log("APIに送信する終了時刻:", endTime);

    if (!date || !startTime || !endTime) {
      setError("開始日時と終了日時を正しく入力してください。");
      setLoading(false);
      return;
    }

    const shiftDataToSend = {
      date: date,
      start_time: startTime,
      end_time: endTime,
      memo: formData.memo || null,
    };

    console.log("APIに送信するデータ:", shiftDataToSend);

    try {
      const response = await shiftAPI.registerShift(shiftDataToSend);
      console.log("シフト登録成功:", response);

      // フォームをリセット
      setFormData({
        start_time: "",
        end_time: "",
        break_time: 60,
        memo: "",
      });

      // カレンダーを更新するためにシフトデータを再取得
      await fetchAndSetShifts();
    } catch (err: any) {
      console.error("シフト登録エラー:", err);
      console.error("エラーレスポンス:", err.response);
      setError(
        err.response?.data?.detail?.[0]?.msg ||
          err.response?.data?.detail ||
          "シフトの登録に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  // シフト承認の処理
  const handleApprove = async (id: number) => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      await shiftAPI.approveShift(id);
      // シフトリストを更新してUIに反映
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === id ? { ...shift, status: "confirmed" } : shift
        )
      );
      // カレンダーイベントも更新
      setCalendarEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.resource.id === id
            ? {
                ...event,
                title: `${event.resource.user_full_name} (confirmed)`,
                resource: { ...event.resource, status: "confirmed" },
              }
            : event
        )
      );
      // 選択中のシフトがあれば更新
      if (selectedShift?.id === id) {
        setSelectedShift({ ...selectedShift, status: "confirmed" });
      }
      // 必要であればモーダルを閉じる
      // setIsModalOpen(false);
    } catch (err) {
      console.error("シフト承認エラー:", err);
      setError("シフトの承認に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // シフト却下の処理
  const handleReject = async (id: number) => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      await shiftAPI.rejectShift(id);
      // シフトリストを更新してUIに反映
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.id === id ? { ...shift, status: "rejected" } : shift
        )
      );
      // カレンダーイベントも更新
      setCalendarEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.resource.id === id
            ? {
                ...event,
                title: `${event.resource.user_full_name} (rejected)`,
                resource: { ...event.resource, status: "rejected" },
              }
            : event
        )
      );
      // 選択中のシフトがあれば更新
      if (selectedShift?.id === id) {
        setSelectedShift({ ...selectedShift, status: "rejected" });
      }
      // 必要であればモーダルを閉じる
      // setIsModalOpen(false);
    } catch (err) {
      console.error("シフト却下エラー:", err);
      setError("シフトの却下に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // シフト削除の処理
  const handleDelete = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await shiftAPI.deleteShift(id);
      // シフトリストから削除
      setMyShifts((prevShifts) => prevShifts.filter((shift) => shift.id !== id));
      setShifts((prevShifts) => prevShifts.filter((shift) => shift.id !== id));
      // カレンダーイベントからも削除
      setCalendarEvents((prevEvents) =>
        prevEvents.filter((event) => event.resource.id !== id)
      );
      // 削除確認ダイアログを閉じる
      setDeleteConfirmOpen(false);
      setShiftToDelete(null);
      // 成功メッセージ（必要に応じて）
      console.log("シフトが削除されました");
    } catch (err) {
      console.error("シフト削除エラー:", err);
      setError("シフトの削除に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 削除確認ダイアログを開く
  const handleDeleteClick = (id: number) => {
    setShiftToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // 削除確認ダイアログを閉じる
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setShiftToDelete(null);
  };

  // 削除確認ダイアログで削除を実行
  const handleDeleteConfirm = () => {
    if (shiftToDelete !== null) {
      handleDelete(shiftToDelete);
    }
  };

  // 一括承認の処理
  const handleBulkApprove = async () => {
    if (!isAdmin || !selectedUserId) return;
    setLoading(true);
    setError(null);
    try {
      // 選択されたユーザーのpendingシフトを取得
      const userPendingShifts = shifts.filter(
        (shift) => shift.user_id === selectedUserId && shift.status === "pending"
      );
      
      // 各シフトを承認
      const approvalPromises = userPendingShifts.map((shift) =>
        shiftAPI.approveShift(shift.id)
      );
      
      await Promise.all(approvalPromises);
      
      // UIを更新
      setShifts((prevShifts) =>
        prevShifts.map((shift) =>
          shift.user_id === selectedUserId && shift.status === "pending"
            ? { ...shift, status: "confirmed" }
            : shift
        )
      );
      
      // カレンダーイベントも更新
      setCalendarEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.resource.user_id === selectedUserId && event.resource.status === "pending"
            ? {
                ...event,
                title: `${event.resource.user_full_name} (confirmed)`,
                resource: { ...event.resource, status: "confirmed" },
              }
            : event
        )
      );
      
      // ダイアログを閉じる
      setBulkApprovalOpen(false);
      setSelectedUserId(null);
      
      console.log(`ユーザーID ${selectedUserId} のシフトを一括承認しました`);
    } catch (err) {
      console.error("一括承認エラー:", err);
      setError("一括承認に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // カレンダーイベント選択時の処理
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedShift(event.resource); // 選択されたシフトの元データをステートに保存
    setIsModalOpen(true); // モーダルを開く
  };

  // モーダル内の承認ボタンクリック処理
  const handleApproveClick = () => {
    if (selectedShift) {
      handleApprove(selectedShift.id);
      // モーダルを閉じるのを handleApprove/handleReject 内で行うか、ここで統一するか検討
      setIsModalOpen(false); // 承認後モーダルを閉じる
    }
  };

  // モーダル内の却下ボタンクリック処理（新規追加）
  const handleRejectClick = () => {
    if (selectedShift) {
      handleReject(selectedShift.id);
      setIsModalOpen(false); // 却下後モーダルを閉じる
    }
  };

  // カレンダーの日付スロット選択時の処理
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    let selectedStartTime = slotInfo.start;
    let selectedEndTime = slotInfo.end;

    // 複数日選択かどうかの判定
    const startDay = selectedStartTime.getDate();
    const endDay = selectedEndTime.getDate();
    const daysDiff = Math.floor((selectedEndTime.getTime() - selectedStartTime.getTime()) / (24 * 60 * 60 * 1000));
    
    // 日付のみ選択されたか、または選択範囲が非常に短い（日跨ぎでない）場合の判定
    const isDateOnlyClick =
      (selectedEndTime.getDate() === selectedStartTime.getDate() + 1 &&
        selectedEndTime.getHours() === 0 &&
        selectedEndTime.getMinutes() === 0) ||
      (selectedEndTime.getDate() === selectedStartTime.getDate() &&
        selectedEndTime.getHours() === selectedStartTime.getHours() &&
        selectedEndTime.getMinutes() === selectedStartTime.getMinutes());

    // 複数日選択の判定（2日以上の日付範囲が選択された場合）
    if (daysDiff >= 1 || (startDay !== endDay && !isDateOnlyClick)) {
      // 複数日選択モード
      setIsMultiDaySelection(true);
      
      // 選択された日付のリストを作成
      const dates: Date[] = [];
      const currentDate = new Date(selectedStartTime);
      currentDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedEndTime);
      endDate.setHours(0, 0, 0, 0);
      
      // 終了日が0時の場合は前日までとする
      if (selectedEndTime.getHours() === 0 && selectedEndTime.getMinutes() === 0) {
        endDate.setDate(endDate.getDate() - 1);
      }
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setSelectedDates(dates);
      
      // 時間のみの入力用にフォームを初期化（デフォルト: 9:00-17:00）
      setFormData((prevData) => ({
        ...prevData,
        start_time: "09:00",
        end_time: "17:00",
      }));
    } else {
      // 単一日選択モード
      setIsMultiDaySelection(false);
      setSelectedDates([selectedStartTime]);
      
      if (isDateOnlyClick) {
        // 日付のみクリックされた場合、デフォルトの勤務時間 (例: 9:00 - 17:00) を設定
        selectedStartTime = setHours(selectedStartTime, 9);
        selectedStartTime = setMinutes(selectedStartTime, 0);
        // 終了時刻を開始時刻の8時間後に設定
        selectedEndTime = addHours(selectedStartTime, 8);
      }

      // フォームの datetime-local input が要求する形式 (YYYY-MM-DDTHH:mm) にフォーマット
      const formattedStartTime = format(selectedStartTime, "yyyy-MM-dd'T'HH:mm");
      const formattedEndTime = format(selectedEndTime, "yyyy-MM-dd'T'HH:mm");

      // フォームデータを更新
      setFormData((prevData) => ({
        ...prevData,
        start_time: formattedStartTime,
        end_time: formattedEndTime,
      }));
    }
    
    // 登録ダイアログを開く
    setIsRegisterDialogOpen(true);
  };

  // 登録ダイアログでの送信処理
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("登録ダイアログでのSubmit処理開始");
    setLoading(true);
    setError(null);

    try {
      if (isMultiDaySelection) {
        // 複数日選択の場合
        const startTime = formData.start_time; // "HH:mm" 形式
        const endTime = formData.end_time; // "HH:mm" 形式
        
        if (!startTime || !endTime) {
          setError("開始時刻と終了時刻を入力してください。");
          setLoading(false);
          return;
        }

        // 時間のバリデーション
        const [startHour, startMin] = startTime.split(":").map(Number);
        const [endHour, endMin] = endTime.split(":").map(Number);
        
        // 同じ日の終了時刻が開始時刻より前の場合はエラー
        if (endHour < startHour || (endHour === startHour && endMin <= startMin)) {
          // 日をまたぐシフトでない限りエラー
          if (endHour >= startHour) {
            setError("終了時刻は開始時刻より後に設定してください。");
            setLoading(false);
            return;
          }
        }

        // 各日付に対してシフトを登録
        const shiftDataArray = selectedDates.map((date) => {
          const dateString = format(date, "yyyy-MM-dd");
          
          // 日をまたぐシフトかどうかを判定
          let adjustedEndTime = endTime;
          
          return {
            date: dateString,
            start_time: startTime,
            end_time: adjustedEndTime,
            memo: formData.memo || null
          };
        });

        console.log("複数日シフト登録データ:", shiftDataArray);

        // バルクAPIを使用して一括登録
        const bulkData = {
          year: selectedDates[0].getFullYear(),
          month: selectedDates[0].getMonth() + 1,
          shifts: shiftDataArray.map(shift => ({
            date: shift.date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            memo: shift.memo,
            availability: "available"
          }))
        };
        const response = await shiftAPI.bulkRegisterShifts(bulkData);
        console.log("複数日シフト登録成功:", response);

        // フォームをリセット
        setFormData({
          start_time: "",
          end_time: "",
          break_time: 60,
          memo: "",
        });
        setSelectedDates([]);
        setIsMultiDaySelection(false);

        // カレンダーを更新
        await fetchAndSetShifts();
        setIsRegisterDialogOpen(false);
      } else {
        // 単一日選択の場合は従来の処理
        const startTimeString = formData.start_time;
        const endTimeString = formData.end_time;

        try {
          if (startTimeString && endTimeString) {
            const startDateTime = new Date(startTimeString);
            const endDateTime = new Date(endTimeString);

            if (startDateTime >= endDateTime) {
              setError("終了時刻は開始時刻より後に設定してください。");
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("日時の検証中にエラーが発生しました:", err);
          setError("日時のフォーマットが正しくありません。");
          setLoading(false);
          return;
        }

        await handleSubmit(e);
        setIsRegisterDialogOpen(false);
      }
    } catch (err: any) {
      console.error("シフト登録エラー:", err);
      setError(
        err.response?.data?.detail?.[0]?.msg ||
          err.response?.data?.detail ||
          "シフトの登録に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  // 表示モード切り替えハンドラ
  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newViewMode: "my" | "all" | null // null許容にする
  ) => {
    if (newViewMode !== null) {
      // nullでなければセット
      setViewMode(newViewMode);
    }
  };

  // 表示するイベントを、表示モードに基づいて選択
  const displayEvents = useMemo(() => {
    // デバッグ出力
    console.log("myShifts:", myShifts);
    console.log("calendarEvents:", calendarEvents);

    if (viewMode === "all" && isAdmin) {
      return calendarEvents;
    } else {
      // 自分のシフトをカレンダーイベントに変換
      const myEvents = myShifts.map((shift) => {
        const shiftDate = parse(shift.date, "yyyy-MM-dd", new Date());
        let startDateTime: Date;
        let endDateTime: Date;

        // 開始・終了時刻がある場合はそれを使用
        if (shift.start_time && shift.end_time) {
          const startTime = parse(shift.start_time, "HH:mm:ss", shiftDate);
          const endTime = parse(shift.end_time, "HH:mm:ss", shiftDate);
          startDateTime = startTime;
          endDateTime =
            endTime < startTime
              ? new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
              : endTime;
        } else {
          // なければ日付全体を使用
          startDateTime = new Date(shiftDate.setHours(0, 0, 0, 0));
          endDateTime = new Date(shiftDate.setHours(23, 59, 59, 999));
        }

        const displayName = user?.full_name || "自分";
        return {
          title: `${displayName} (${shift.status})`,
          start: startDateTime,
          end: endDateTime,
          resource: shift,
        };
      });

      console.log("myEvents:", myEvents);
      return myEvents;
    }
  }, [viewMode, isAdmin, calendarEvents, myShifts, user]);

  if (loading && shifts.length === 0 && myShifts.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="shift-management-page">
      <h2>シフト管理</h2>

      {/* 表示切り替えボタン（管理者のみ） */}
      {isAdmin && (
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            color="primary"
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <ToggleButton value="my">自分のシフト</ToggleButton>
            <ToggleButton value="all">全員のシフト</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* エラーメッセージ */}
      <ErrorMessage message={error} />
      <LoadingSpinner loading={loading} text="シフトデータを読み込み中..." />

      {/* シフトカレンダー */}
      {!loading && (
        <div className="shift-calendar-container">
          <h3>シフトカレンダー</h3>
          <ShiftCalendar
            events={displayEvents}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            eventStyleGetter={eventStyleGetter}
          />
        </div>
      )}

      {/* 自分のシフト一覧 */}
      <div className="my-shifts">
        <h3>自分のシフト</h3>

        {myShifts.length === 0 ? (
          <div className="no-records">
            <p>シフト登録がありません</p>
          </div>
        ) : (
          <table className="shifts-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>開始時間</th>
                <th>終了時間</th>
                <th>状態</th>
                <th>メモ</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {myShifts.map((shift) => (
                <tr
                  key={shift.id}
                  className={
                    shift.status === "confirmed"
                      ? "approved"
                      : shift.status === "pending"
                      ? "pending"
                      : ""
                  }
                >
                  <td>{shift.date}</td>
                  <td>{shift.start_time || "-"}</td>
                  <td>{shift.end_time || "-"}</td>
                  <td>
                    {shift.status === "confirmed"
                      ? "確定"
                      : shift.status === "pending"
                      ? "申請中"
                      : shift.status}
                  </td>
                  <td>{shift.memo || "-"}</td>
                  <td>
                    {shift.status === "pending" && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(shift.id)}
                        disabled={loading}
                        title="削除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 全員のシフト一覧（管理者のみ、テーブル表示も残しておく） */}
      {isAdmin && (
        <div className="all-shifts">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <h3>全員のシフト</h3>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setBulkApprovalOpen(true)}
              disabled={loading || shifts.filter(s => s.status === "pending").length === 0}
            >
              一括承認
            </Button>
          </Box>

          {shifts.length === 0 ? (
            <div className="no-records">
              <p>シフト登録がありません</p>
            </div>
          ) : (
            <table className="shifts-table">
              <thead>
                <tr>
                  <th>名前</th>
                  <th>日付</th>
                  <th>開始時間</th>
                  <th>終了時間</th>
                  <th>状態</th>
                  <th>メモ</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr
                    key={shift.id}
                    className={
                      shift.status === "confirmed"
                        ? "approved"
                        : shift.status === "pending"
                        ? "pending"
                        : ""
                    }
                  >
                    <td>{shift.user_full_name || "-"}</td>
                    <td>{shift.date}</td>
                    <td>{shift.start_time || "-"}</td>
                    <td>{shift.end_time || "-"}</td>
                    <td>
                      {shift.status === "confirmed"
                        ? "確定"
                        : shift.status === "pending"
                        ? "申請中"
                        : shift.status}
                    </td>
                    <td>{shift.memo || "-"}</td>
                    <td>
                      {shift.status === "pending" && (
                        <Box display="flex" gap={1}>
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleApprove(shift.id)}
                            disabled={loading}
                            title="承認"
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleReject(shift.id)}
                            disabled={loading}
                            title="却下"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* シフト詳細・承認モーダル */}
      {selectedShift && (
        <ShiftDialog
          open={isModalOpen}
          title="シフト詳細"
          contentText={
            viewMode === "all" && isAdmin
              ? `従業員: ${selectedShift.user_full_name || "N/A"}\n日付: ${
                  selectedShift.date
                }\n時間: ${selectedShift.start_time || "未定"} - ${
                  selectedShift.end_time || "未定"
                }\n状態: ${
                  selectedShift.status === "confirmed"
                    ? "確定"
                    : selectedShift.status === "pending"
                    ? "申請中"
                    : selectedShift.status
                }\nメモ: ${selectedShift.memo || "-"}`
              : `日付: ${selectedShift.date}\n時間: ${
                  selectedShift.start_time || "未定"
                } - ${selectedShift.end_time || "未定"}\n状態: ${
                  selectedShift.status === "confirmed"
                    ? "確定"
                    : selectedShift.status === "pending"
                    ? "申請中"
                    : selectedShift.status
                }\nメモ: ${selectedShift.memo || "-"}`
          }
          mode={
            isAdmin && viewMode === "all" && selectedShift.status === "pending"
              ? "approve"
              : "view"
          }
          shiftStatus={selectedShift.status}
          isMyShift={selectedShift.user_id === user?.id}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(_e) => {}} // ダミー関数、view/approve モードでは使用しない
          onApprove={handleApproveClick}
          onReject={handleRejectClick}
          onDelete={() => {
            setIsModalOpen(false);
            handleDeleteClick(selectedShift.id);
          }}
        />
      )}

      {/* シフト登録ダイアログ */}
      <ShiftDialog
        open={isRegisterDialogOpen}
        title={isMultiDaySelection ? "複数日シフト登録" : "シフト登録"}
        contentText={
          isMultiDaySelection
            ? `${format(selectedDates[0], "M/d")}〜${format(
                selectedDates[selectedDates.length - 1],
                "M/d"
              )} の${selectedDates.length}日間に同じ時間でシフトを登録します。`
            : "勤務時間を設定してください。"
        }
        mode="register"
        formData={formData}
        onClose={() => {
          setIsRegisterDialogOpen(false);
          setSelectedDates([]);
          setIsMultiDaySelection(false);
        }}
        onSubmit={handleRegisterSubmit}
        onChange={handleChange}
        useDateTime={!isMultiDaySelection}
        selectedDates={isMultiDaySelection ? selectedDates : undefined}
      />

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">シフト削除の確認</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            このシフトを削除してもよろしいですか？この操作は取り消すことができません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            キャンセル
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            削除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 一括承認ダイアログ */}
      <Dialog
        open={bulkApprovalOpen}
        onClose={() => setBulkApprovalOpen(false)}
        aria-labelledby="bulk-approval-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="bulk-approval-dialog-title">シフト一括承認</DialogTitle>
        <DialogContent>
          <DialogContentText>
            特定のユーザーの申請中のシフトをすべて承認します。
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="user-select-label">ユーザーを選択</InputLabel>
            <Select
              labelId="user-select-label"
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              label="ユーザーを選択"
            >
              {/* ユニークなユーザーリストを作成 */}
              {Array.from(
                new Map(
                  shifts
                    .filter((shift) => shift.status === "pending")
                    .map((shift) => [shift.user_id, shift])
                ).values()
              ).map((shift) => (
                <MenuItem key={shift.user_id} value={shift.user_id}>
                  {shift.user_full_name} (
                  {shifts.filter(
                    (s) => s.user_id === shift.user_id && s.status === "pending"
                  ).length}
                  件の申請中シフト)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkApprovalOpen(false)} color="primary">
            キャンセル
          </Button>
          <Button
            onClick={handleBulkApprove}
            color="primary"
            variant="contained"
            disabled={!selectedUserId || loading}
          >
            一括承認
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ShiftManagementPage;
