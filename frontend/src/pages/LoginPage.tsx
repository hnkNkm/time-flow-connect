import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "../styles/LoginPage.css";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (err) {
      console.error("ログインエラー:", err);
    }
  };

  return (
    <div className="login-page">
      <h2>ログイン</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">ユーザー名</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">パスワード</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>

      <div className="login-info">
        <p>初期管理者アカウント</p>
        <p>ユーザー名: admin</p>
        <p>パスワード: admin123</p>
      </div>
    </div>
  );
};

export default LoginPage;
