import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { AppConfig } from './common/config';

export interface DatabaseStackProps extends cdk.StackProps {
  config: AppConfig;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseUrlParameter: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc, securityGroup } = props;

    // RDS Subnet Group
    const subnetGroup = new rds.SubnetGroup(this, 'RDSSubnetGroup', {
      description: 'Subnet group for RDS',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // Database Parameter Group
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'pg_stat_statements.track': 'ALL',
        'log_statement': 'all',
        'log_min_duration_statement': '1000', // 1秒以上のクエリをログに記録
      },
    });

    // RDS Instance
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [securityGroup],
      subnetGroup,
      parameterGroup,
      databaseName: 'timeflowconnect',
      allocatedStorage: config.database.allocatedStorage,
      backupRetention: cdk.Duration.days(config.database.backupRetention),
      multiAz: config.database.multiAz,
      deletionProtection: config.environment === 'prod',
      removalPolicy: config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      storageEncrypted: true,
      monitoringInterval: cdk.Duration.minutes(1),
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DAYS_7, // 無料枠
      cloudwatchLogsExports: ['postgresql'],
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
    });

    // Database URL を Parameter Store に保存
    const databaseUrl = `postgresql://${this.database.secret?.secretValueFromJson('username').unsafeUnwrap()}:${this.database.secret?.secretValueFromJson('password').unsafeUnwrap()}@${this.database.dbInstanceEndpointAddress}:${this.database.dbInstanceEndpointPort}/${this.database.instanceIdentifier}`;

    this.databaseUrlParameter = new ssm.StringParameter(this, 'DatabaseUrlParameter', {
      parameterName: `/${config.appName}/${config.environment}/database-url`,
      stringValue: databaseUrl,
      type: ssm.ParameterType.SECURE_STRING,
      description: 'Database connection URL for the application',
    });

    // 出力
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'RDS Database Endpoint',
      exportName: `${config.appName}-${config.environment}-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.database.secret?.secretArn || '',
      description: 'Database Secret ARN',
      exportName: `${config.appName}-${config.environment}-db-secret-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseUrlParameterName', {
      value: this.databaseUrlParameter.parameterName,
      description: 'Database URL Parameter Name',
      exportName: `${config.appName}-${config.environment}-db-url-param`,
    });

    // タグ付け
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}