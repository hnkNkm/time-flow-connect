import { useState, useEffect, FormEvent } from "react";
import { fetchHello, createAttendance, AttendanceData } from "../services/api";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // フォーム用のstate
  const [formData, setFormData] = useState<AttendanceData>({
    employee_name: "",
    check_in_time: new Date().toISOString().slice(0, 16), // YYYY-MM-DDThh:mm
    memo: "",
  });

  useEffect(() => {
    const loadMessage = async () => {
      try {
        const data = await fetchHello();
        setMessage(data.message);
      } catch (err) {
        setError("APIの呼び出しに失敗しました");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await createAttendance(formData);

      if (response.status === "success") {
        setSuccessMessage(response.message);
        // フォームをリセット
        setFormData({
          employee_name: "",
          check_in_time: new Date().toISOString().slice(0, 16),
          memo: "",
        });
      } else {
        setError("勤怠の登録に失敗しました");
      }
    } catch (err) {
      setError("勤怠の登録に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>TimeFlowConnect</h1>

      {/* メッセージ表示エリア */}
      <div className="card">
        <h2>バックエンドからのメッセージ：</h2>
        <p>{message}</p>
      </div>

      {/* 勤怠登録フォーム */}
      <div className="card">
        <h2>勤怠登録</h2>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label htmlFor="employee_name">名前：</label>
            <input
              type="text"
              id="employee_name"
              value={formData.employee_name}
              onChange={(e) =>
                setFormData({ ...formData, employee_name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label htmlFor="check_in_time">チェックイン時間：</label>
            <input
              type="datetime-local"
              id="check_in_time"
              value={formData.check_in_time}
              onChange={(e) =>
                setFormData({ ...formData, check_in_time: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label htmlFor="memo">メモ：</label>
            <textarea
              id="memo"
              value={formData.memo}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
              rows={3}
            />
          </div>

          <button type="submit" disabled={loading}>
            登録
          </button>
        </form>

        {/* エラーメッセージ */}
        {error && (
          <div style={{ color: "red", marginTop: "1rem" }}>{error}</div>
        )}

        {/* 成功メッセージ */}
        {successMessage && (
          <div style={{ color: "green", marginTop: "1rem" }}>
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
