export interface AppConfig {
  appName: string;
  environment: string;
  awsEnv: {
    account: string;
    region: string;
  };
  vpc: {
    maxAzs: number;
    natGateways: number;
  };
  database: {
    instanceClass: string;
    allocatedStorage: number;
    backupRetention: number;
    multiAz: boolean;
  };
  lambda: {
    memorySize: number;
    timeout: number;
  };
  tags: {
    [key: string]: string;
  };
}

export const getConfig = (environment: string): AppConfig => {
  const baseConfig: AppConfig = {
    appName: 'timeflowconnect',
    environment,
    awsEnv: {
      account: process.env.CDK_DEFAULT_ACCOUNT || '',
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
    vpc: {
      maxAzs: 2,
      natGateways: 1, // コスト削減のため1つのみ
    },
    database: {
      instanceClass: 't4g.micro',
      allocatedStorage: 20,
      backupRetention: 7,
      multiAz: false, // コスト削減のため単一AZ
    },
    lambda: {
      memorySize: 512,
      timeout: 30,
    },
    tags: {
      Project: 'TimeFlowConnect',
      Environment: environment,
      ManagedBy: 'CDK',
    },
  };

  // 環境別の設定をオーバーライド
  if (environment === 'prod') {
    // 本番環境用の設定（必要に応じて調整）
    return baseConfig;
  }

  return baseConfig;
};