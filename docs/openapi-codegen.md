# OpenAPI Code Generation

このドキュメントは、FastAPIのOpenAPI仕様からTypeScriptの型定義とAPIクライアントを自動生成する方法を説明します。

## セットアップ

### 1. 依存関係のインストール

```bash
cd frontend
npm install
```

これにより、`@openapitools/openapi-generator-cli`がインストールされます。

### 2. FastAPIサーバーの起動

OpenAPIスキーマを取得するために、FastAPIサーバーが起動している必要があります。

```bash
# プロジェクトルートで実行
docker-compose up backend
```

## 型生成の実行

### 方法1: Docker Composeを使用（推奨）

```bash
# プロジェクトルートで実行
./scripts/generate-api-docker.sh
```

### 方法2: Docker Compose経由で直接実行

```bash
# すべてのサービスを起動
docker-compose up -d

# frontendコンテナ内で型生成を実行
docker-compose exec frontend npm run generate:api
```

### 方法3: バックエンドコンテナでPythonスクリプトを使用

```bash
# バックエンドコンテナ内でOpenAPIスキーマをエクスポート
docker-compose exec backend python export_openapi.py

# その後、frontendで型生成
docker-compose exec frontend npm run generate:types
```

### 方法4: ホストマシンから実行（Node.jsが必要）

```bash
# frontendディレクトリで実行
cd frontend
npm run generate:api
```

このコマンドは以下の処理を実行します：
1. `generate:openapi` - FastAPIからOpenAPIスキーマを取得して`openapi.json`に保存
2. `generate:types` - OpenAPI GeneratorでTypeScriptの型定義とAPIクライアントを生成

## 生成されるファイル

`frontend/src/api/generated/`ディレクトリに以下のファイルが生成されます：

- `api/` - APIクライアントクラス
- `models/` - TypeScriptの型定義
- `base.ts` - 基本設定
- `common.ts` - 共通ユーティリティ
- `configuration.ts` - API設定
- `index.ts` - エクスポート

## 使用例

### 基本的な使い方

```typescript
// 生成されたAPIクライアントのインポート
import { authApi, attendanceApi, setAuthToken } from '@/api/client';

// ログイン
const response = await authApi.loginForAccessTokenApiAuthTokenPost({
  username: 'user@example.com',
  password: 'password123'
});

// トークンを設定
setAuthToken(response.data.access_token);

// 勤怠打刻
const attendance = await attendanceApi.checkInApiAttendanceCheckInPost({
  srcSchemasAttendanceAttendanceCreate: {
    check_in_time: new Date().toISOString(),
    memo: '出社しました'
  }
});

// 自分の勤怠記録を取得
const records = await attendanceApi.getMyAttendanceRecordsApiAttendanceMyRecordsGet();
```

### 既存のaxiosインスタンスを使用する場合

```typescript
import api from '@/services/api';
import type { UserResponse, SrcSchemasAttendanceAttendanceCreate } from '@/api/generated';

// 生成された型を使用
const getMe = async (): Promise<UserResponse> => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

const checkIn = async (data: SrcSchemasAttendanceAttendanceCreate) => {
  const response = await api.post('/api/attendance/check-in', data);
  return response.data;
};
```

## 開発ワークフロー

1. バックエンドでAPIを変更
2. `docker-compose restart backend`でサーバーを再起動
3. `cd frontend && npm run generate:api`で型を再生成
4. TypeScriptの型エラーを修正

## 注意事項

- 生成されたファイルは直接編集しないでください
- OpenAPIスキーマが変更されたら、必ず型を再生成してください
- `openapi.json`と`frontend/src/api/generated/`は.gitignoreに追加することを推奨します