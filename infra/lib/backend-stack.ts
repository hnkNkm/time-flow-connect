import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Construct } from 'constructs';
import { AppConfig } from './common/config';

export interface BackendStackProps extends cdk.StackProps {
  config: AppConfig;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  databaseUrlParameter: ssm.StringParameter;
}

export class BackendStack extends cdk.Stack {
  public readonly apiGateway: apigateway.RestApi;
  public readonly apiFunction: PythonFunction;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const { config, vpc, securityGroup, databaseUrlParameter } = props;

    // JWT Secret を Parameter Store に保存
    const jwtSecretParameter = new ssm.StringParameter(this, 'JwtSecretParameter', {
      parameterName: `/${config.appName}/${config.environment}/jwt-secret`,
      stringValue: this.node.tryGetContext('jwtSecret') || 'your-secret-key-here',
      type: ssm.ParameterType.SECURE_STRING,
      description: 'JWT Secret for authentication',
    });

    // Lambda Layer for dependencies
    const dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      code: lambda.Code.fromAsset('../backend', {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output/python && ' +
            'cp -r src /asset-output/python/'
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: 'Dependencies layer for TimeFlowConnect',
    });

    // Lambda Function
    this.apiFunction = new PythonFunction(this, 'ApiFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      entry: '../backend',
      index: 'lambda_handler.py',
      handler: 'handler',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      environment: {
        DATABASE_URL: databaseUrlParameter.stringValue,
        JWT_SECRET: jwtSecretParameter.stringValue,
        ENVIRONMENT: config.environment,
      },
      layers: [dependenciesLayer],
      timeout: cdk.Duration.seconds(config.lambda.timeout),
      memorySize: config.lambda.memorySize,
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Parameter Store の読み取り権限を付与
    databaseUrlParameter.grantRead(this.apiFunction);
    jwtSecretParameter.grantRead(this.apiFunction);

    // API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: `${config.appName}-${config.environment}-api`,
      description: 'TimeFlowConnect API Gateway',
      deployOptions: {
        stageName: config.environment,
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: true,
        tracingEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Lambda Integration
    const integration = new apigateway.LambdaIntegration(this.apiFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API Gateway Routes
    const apiResource = this.apiGateway.root.addResource('api');
    
    // すべてのAPIリクエストをLambdaにプロキシ
    const proxyResource = apiResource.addResource('{proxy+}');
    proxyResource.addMethod('ANY', integration);
    
    // ルートパスも処理
    apiResource.addMethod('ANY', integration);

    // Lambda Handler ファイルの作成
    this.createLambdaHandler();

    // 出力
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.apiGateway.url,
      description: 'API Gateway Endpoint',
      exportName: `${config.appName}-${config.environment}-api-endpoint`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.apiFunction.functionArn,
      description: 'Lambda Function ARN',
      exportName: `${config.appName}-${config.environment}-lambda-arn`,
    });

    // タグ付け
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  private createLambdaHandler() {
    // Lambda ハンドラーファイルは別途作成する必要があります
    // ここではコメントとして記載
    /*
    Lambda handler file (lambda_handler.py) should be created at ../backend/lambda_handler.py:
    
    from mangum import Mangum
    from src.main import app
    
    handler = Mangum(app)
    */
  }
}