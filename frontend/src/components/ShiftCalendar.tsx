import React from "react";
import {
  Calendar as BigCalendarRaw,
  dateFnsLocalizer,
  Event as BigCalendarEvent,
  SlotInfo,
} from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import ja from "date-fns/locale/ja";
import "react-big-calendar/lib/css/react-big-calendar.css";

// ローカライザーの設定
const locales = {
  ja: ja,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Calendarコンポーネントをany経由で有効なJSX要素にキャスト
const BigCalendar = BigCalendarRaw as unknown as React.ComponentType<any>;

export interface ShiftRecord {
  id: number;
  user_id: number;
  user_full_name?: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  memo: string | null;
}

// カレンダーイベントの型
export interface CalendarEvent extends BigCalendarEvent {
  resource: ShiftRecord; // 元のシフトデータを保持
}

interface ShiftCalendarProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: SlotInfo) => void;
  eventStyleGetter: (event: CalendarEvent) => { style: React.CSSProperties };
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({
  events,
  onSelectEvent,
  onSelectSlot,
  eventStyleGetter,
}) => {
  // 時間選択を受け付けるかどうかのコールバック（trueを返すと選択可能）
  const selectableCallback = () => true;

  // デバッグ用: イベントのロギング
  React.useEffect(() => {
    console.log("ShiftCalendarに渡されたイベント:", events);
  }, [events]);

  // デバッグ用: スロット選択のラップ関数
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    console.log("ShiftCalendar: スロット選択イベント:", slotInfo);
    onSelectSlot(slotInfo);
  };

  return (
    <div className="shift-calendar">
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable={true}
        eventPropGetter={eventStyleGetter}
        formats={{
          timeGutterFormat: (date: Date) =>
            format(date, "HH:mm", { locale: ja }),
          dayFormat: (date: Date) => format(date, "d (EEE)", { locale: ja }),
          dayHeaderFormat: (date: Date) =>
            format(date, "MM月dd日 (EEE)", { locale: ja }),
          monthHeaderFormat: (date: Date) =>
            format(date, "yyyy年MM月", { locale: ja }),
        }}
        messages={{
          today: "今日",
          previous: "前へ",
          next: "次へ",
          month: "月",
          week: "週",
          day: "日",
          agenda: "予定",
          date: "日付",
          time: "時間",
          event: "予定",
          allDay: "終日",
          work_week: "稼働日",
          showMore: (total: number) => `+${total} 件`,
        }}
        culture="ja"
        selectablePredicate={selectableCallback}
      />
    </div>
  );
};

export default ShiftCalendar;
