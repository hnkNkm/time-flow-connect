import React, { useState, useEffect, useMemo } from "react";
import { SlotInfo } from "react-big-calendar";
import {
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  addHours,
} from "date-fns";
import parse from "date-fns/parse";
import format from "date-fns/format";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

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

  // シフト登録フォーム用のステート
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    break_time: 60, // デフォルト60分
    memo: "",
  });

  // 日付範囲のステート
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });

  const [endDate, setEndDate] = useState(() => {
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

    // 開始時刻が変更され、値が有効な場合
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

    // デバッグ用ログ
    // console.log("Selected slot start:", selectedStartTime);
    // console.log("Selected slot end:", selectedEndTime);

    // 日付のみ選択されたか、または選択範囲が非常に短い（日跨ぎでない）場合の判定
    // endがstartの翌日0時になっている場合や、startとendの時刻が同じ場合は日付のみ選択とみなす
    const isDateOnlyClick =
      (selectedEndTime.getDate() === selectedStartTime.getDate() + 1 &&
        selectedEndTime.getHours() === 0 &&
        selectedEndTime.getMinutes() === 0) ||
      (selectedEndTime.getDate() === selectedStartTime.getDate() &&
        selectedEndTime.getHours() === selectedStartTime.getHours() &&
        selectedEndTime.getMinutes() === selectedStartTime.getMinutes());

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
    // 登録ダイアログを開く
    setIsRegisterDialogOpen(true);
  };

  // 登録ダイアログでの送信処理
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("登録ダイアログでのSubmit処理開始");

    // バリデーション（handleSubmitと同じロジック）
    const startTimeString = formData.start_time;
    const endTimeString = formData.end_time;

    console.log("フォームデータ:", formData);

    try {
      if (startTimeString && endTimeString) {
        const startDateTime = new Date(startTimeString);
        const endDateTime = new Date(endTimeString);

        // 開始時刻が終了時刻より後の場合はエラー
        if (startDateTime >= endDateTime) {
          console.error(
            "時間バリデーションエラー:",
            startDateTime,
            endDateTime
          );
          setError("終了時刻は開始時刻より後に設定してください。");
          return;
        }
      }
    } catch (err) {
      console.error("日時の検証中にエラーが発生しました:", err);
      setError("日時のフォーマットが正しくありません。");
      return;
    }

    await handleSubmit(e);
    setIsRegisterDialogOpen(false);
  };

  // 表示モード切り替えハンドラ
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 全員のシフト一覧（管理者のみ、テーブル表示も残しておく） */}
      {isAdmin && (
        <div className="all-shifts">
          <h3>全員のシフト</h3>

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
                      {shift.status !== "confirmed" && (
                        <button
                          className="approve-button"
                          onClick={() => handleApprove(shift.id)}
                          disabled={loading}
                        >
                          承認
                        </button>
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
          onClose={() => setIsModalOpen(false)}
          onSubmit={(e) => {}} // ダミー関数、view/approve モードでは使用しない
          onApprove={handleApproveClick}
          onReject={handleRejectClick}
        />
      )}

      {/* シフト登録ダイアログ */}
      <ShiftDialog
        open={isRegisterDialogOpen}
        title="シフト登録"
        contentText="勤務時間を設定してください。"
        mode="register"
        formData={formData}
        onClose={() => setIsRegisterDialogOpen(false)}
        onSubmit={handleRegisterSubmit}
        onChange={handleChange}
        useDateTime={true}
      />
    </div>
  );
};

export default ShiftManagementPage;
