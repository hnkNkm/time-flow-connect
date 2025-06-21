#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { getConfig } from '../lib/common/config';

const app = new cdk.App();

// 環境を取得（デフォルトは 'dev'）
const environment = app.node.tryGetContext('environment') || 'dev';
const config = getConfig(environment);

// AWS 環境設定
const env = {
  account: config.awsEnv.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.awsEnv.region || process.env.CDK_DEFAULT_REGION,
};

// Network Stack
const networkStack = new NetworkStack(app, `${config.appName}-${config.environment}-network`, {
  config,
  env,
  description: 'TimeFlowConnect Network Infrastructure',
});

// Database Stack
const databaseStack = new DatabaseStack(app, `${config.appName}-${config.environment}-database`, {
  config,
  vpc: networkStack.vpc,
  securityGroup: networkStack.rdsSecurityGroup,
  env,
  description: 'TimeFlowConnect Database Infrastructure',
});
databaseStack.addDependency(networkStack);

// Backend Stack
const backendStack = new BackendStack(app, `${config.appName}-${config.environment}-backend`, {
  config,
  vpc: networkStack.vpc,
  securityGroup: networkStack.lambdaSecurityGroup,
  databaseUrlParameter: databaseStack.databaseUrlParameter,
  env,
  description: 'TimeFlowConnect Backend Infrastructure',
});
backendStack.addDependency(databaseStack);

// Frontend Stack
const frontendStack = new FrontendStack(app, `${config.appName}-${config.environment}-frontend`, {
  config,
  apiEndpoint: backendStack.apiGateway.url,
  env,
  description: 'TimeFlowConnect Frontend Infrastructure',
});
frontendStack.addDependency(backendStack);

// タグの追加
const tags = {
  ...config.tags,
  StackEnvironment: config.environment,
  CreatedBy: 'CDK',
};

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

app.synth();