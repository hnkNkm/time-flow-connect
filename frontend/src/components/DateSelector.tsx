import React from "react";

interface DateSelectorProps {
  year: number;
  month: number;
  onYearChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onMonthChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  yearRange?: number; // 過去何年分を表示するか（デフォルト3年）
}

const DateSelector: React.FC<DateSelectorProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  yearRange = 3,
}) => {
  // 年の選択肢を生成（現在から過去n年分）
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - yearRange; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="date-selector">
      <select value={year} onChange={onYearChange}>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>

      <select value={month} onChange={onMonthChange}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {m}月
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateSelector;
