import { Configuration, AuthApi, AttendanceApi, ShiftsApi } from './generated';
import type { AxiosError } from 'axios';

// API設定
const config = new Configuration({
  basePath: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// APIクライアントのインスタンス
export const authApi = new AuthApi(config);
export const attendanceApi = new AttendanceApi(config);
export const shiftsApi = new ShiftsApi(config);

// トークンを設定する関数
export const setAuthToken = (token: string) => {
  const newConfig = new Configuration({
    basePath: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    accessToken: token,
  });
  
  // 新しい設定で再初期化
  authApi.configuration = newConfig;
  attendanceApi.configuration = newConfig;
  shiftsApi.configuration = newConfig;
};

// エラーハンドリングのヘルパー
export const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    if (axiosError.response?.status === 401) {
      return '認証エラー: ログインし直してください';
    }
    if (axiosError.response?.status === 403) {
      return 'アクセス権限がありません';
    }
    if (axiosError.response?.status === 404) {
      return 'リソースが見つかりません';
    }
    if (axiosError.response?.status === 500) {
      return 'サーバーエラーが発生しました';
    }
  }
  return 'エラーが発生しました';
};