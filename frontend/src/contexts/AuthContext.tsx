import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import api from "../services/api";

// ユーザーの型定義
interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

// 認証コンテキストの型定義
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

// 認証コンテキストの作成
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: () => {},
  error: null,
});

// 認証プロバイダーの型定義
interface AuthProviderProps {
  children: ReactNode;
}

// 認証プロバイダーコンポーネント
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 認証状態の初期化
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          // APIヘッダーにトークンを設定
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // ユーザー情報を取得
          const response = await api.get("/api/auth/me");
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (err) {
          // トークンが無効な場合はクリア
          console.error("認証エラー:", err);
          localStorage.removeItem("token");
          api.defaults.headers.common["Authorization"] = "";
          setIsAuthenticated(false);
          setUser(null);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  // ログイン処理
  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      // トークンを取得
      const response = await api.post(
        "/api/auth/token",
        new URLSearchParams({
          username,
          password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = response.data;

      // トークンを保存
      localStorage.setItem("token", access_token);
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      // ユーザー情報を取得
      const userResponse = await api.get("/api/auth/me");
      setUser(userResponse.data);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error("ログインエラー:", err);
      setError(err.response?.data?.detail || "ログインに失敗しました");
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ログアウト処理
  const logout = () => {
    localStorage.removeItem("token");
    api.defaults.headers.common["Authorization"] = "";
    setIsAuthenticated(false);
    setUser(null);
  };

  const isAdmin = user?.is_admin || false;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isAdmin,
        loading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 認証コンテキストを使用するためのカスタムフック
export const useAuth = () => useContext(AuthContext);
