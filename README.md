# TimeFlowConnect - モダン勤怠管理システム

## 概要

AWS 環境で動作するサーバーレスな勤怠管理システム。FastAPI と React を使用し、最新のクラウドテクノロジーを活用して構築。

## 主な機能

- 勤怠記録（出勤・退勤）
- 勤務時間の自動計算
- 月次レポート生成
- リアルタイム打刻通知
- 休暇申請・承認ワークフロー

## 技術スタック

### バックエンド

- FastAPI
- AWS Lambda
- PostgreSQL (RDS)
- AWS IoT Core

### フロントエンド

- React
- TypeScript
- Material-UI

### インフラストラクチャ

- AWS CDK
- AWS CloudFormation

## セットアップ手順

### 必要条件

- Python 3.9+
- Node.js 18+
- AWS CLI
- AWS CDK CLI

### バックエンド開発環境のセットアップ

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### フロントエンド開発環境のセットアップ

```bash
cd frontend
npm install
```

### インフラストラクチャのデプロイ

```bash
cd infra
npm install
cdk deploy
```

## 開発ガイドライン

- コードスタイル：PEP 8（Python）、Prettier（JavaScript/TypeScript）
- ブランチ戦略：GitHub Flow
- コミットメッセージ：Conventional Commits

## ライセンス

MIT License
