# TimeFlowConnect Infrastructure

このディレクトリには、TimeFlowConnectをAWSにデプロイするためのCDKコードが含まれています。

## アーキテクチャ

- **Backend**: Lambda + API Gateway
- **Database**: RDS PostgreSQL t4g.micro（単一AZ）
- **Frontend**: S3 + CloudFront
- **Network**: VPC with NAT Gateway（1つ）

## 想定月額コスト

- Lambda: ~$0-5（使用量に依存）
- API Gateway: ~$3.5（月100万リクエスト想定）
- RDS PostgreSQL t4g.micro: ~$15（単一AZ）
- S3 + CloudFront: ~$1-3
- NAT Gateway: ~$45（1つ）
- **合計: 月額約$65-70（約9,000-10,000円）**

※NAT Gatewayが最もコストがかかるため、必要に応じて削除も検討してください。

## 前提条件

1. AWS CLIがインストールされ、設定済みであること
2. Node.js 18以上がインストールされていること
3. AWS CDK CLIがインストールされていること
   ```bash
   npm install -g aws-cdk
   ```

## セットアップ

1. 依存関係のインストール
   ```bash
   cd infra
   npm install
   ```

2. AWS CDKのブートストラップ（初回のみ）
   ```bash
   cdk bootstrap
   ```

3. Lambda用のハンドラーファイルを作成
   ```bash
   # backend/lambda_handler.py を作成
   cat > ../backend/lambda_handler.py << 'EOF'
   from mangum import Mangum
   from src.main import app
   
   handler = Mangum(app)
   EOF
   ```

4. フロントエンドのビルド
   ```bash
   cd ../frontend
   npm install
   npm run build
   cd ../infra
   ```

## デプロイ

### 環境変数の設定

以下の環境変数を設定してください：

```bash
export CDK_DEFAULT_ACCOUNT=<your-aws-account-id>
export CDK_DEFAULT_REGION=ap-northeast-1
```

### デプロイコマンド

1. 変更内容の確認
   ```bash
   npm run diff
   ```

2. すべてのスタックをデプロイ
   ```bash
   npm run deploy
   ```

3. 個別のスタックをデプロイ
   ```bash
   cdk deploy timeflowconnect-dev-network
   cdk deploy timeflowconnect-dev-database
   cdk deploy timeflowconnect-dev-backend
   cdk deploy timeflowconnect-dev-frontend
   ```

### デプロイ後の設定

1. データベースの初期化
   - RDSのセキュリティグループに一時的にアクセスを許可
   - ALembicでマイグレーションを実行
   - セキュリティグループを元に戻す

2. 環境変数の更新
   - Parameter Storeで`JWT_SECRET`を適切な値に更新

## 開発環境

開発環境向けのデプロイ：
```bash
cdk deploy --all --context environment=dev
```

## 本番環境

本番環境向けのデプロイ：
```bash
cdk deploy --all --context environment=prod
```

## コスト削減のヒント

1. **NAT Gatewayの削除**
   - Lambdaがインターネットアクセスを必要としない場合は削除可能
   - `network-stack.ts`で`natGateways: 0`に設定

2. **RDSの停止**
   - 使用しない時間帯は手動で停止
   - AWS Systems Managerで自動停止/起動をスケジュール

3. **Lambda同時実行数の制限**
   - 予期しない高額請求を防ぐため、同時実行数を制限

## トラブルシューティング

### デプロイが失敗する場合

1. AWS認証情報を確認
   ```bash
   aws sts get-caller-identity
   ```

2. CDKのバージョンを確認
   ```bash
   cdk --version
   ```

3. CloudFormationスタックの状態を確認
   ```bash
   aws cloudformation list-stacks --stack-status-filter CREATE_FAILED UPDATE_FAILED
   ```

### リソースの削除

すべてのリソースを削除する場合：
```bash
npm run destroy
```

注意: RDSのスナップショットは手動で削除する必要があります。

## セキュリティ考慮事項

1. JWT_SECRETは必ず強力なランダム文字列に変更してください
2. RDSのマスターパスワードはSecrets Managerで管理されます
3. すべての通信はHTTPS/TLSで暗号化されます
4. S3バケットはパブリックアクセスをブロックしています