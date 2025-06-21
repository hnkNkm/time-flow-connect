import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AppConfig } from './common/config';

export interface FrontendStackProps extends cdk.StackProps {
  config: AppConfig;
  apiEndpoint: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config, apiEndpoint } = props;

    // S3 Bucket for hosting static files
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${config.appName}-${config.environment}-frontend`,
      removalPolicy: config.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'prod',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: config.environment === 'prod',
      lifecycleRules: [{
        id: 'delete-old-versions',
        enabled: true,
        noncurrentVersionExpiration: cdk.Duration.days(30),
      }],
    });

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${config.appName} ${config.environment}`,
    });

    // Grant read permissions to CloudFront
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.bucket.arnForObjects('*')],
      principals: [originAccessIdentity.grantPrincipal],
    }));

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // 最も安いプライスクラス（北米・ヨーロッパのみ）
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiEndpoint.replace('https://', '').replace('http://', ''), {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      comment: `${config.appName} ${config.environment} distribution`,
      enableLogging: config.environment === 'prod',
      logBucket: config.environment === 'prod' ? new s3.Bucket(this, 'LogBucket', {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        lifecycleRules: [{
          id: 'delete-old-logs',
          enabled: true,
          expiration: cdk.Duration.days(90),
        }],
      }) : undefined,
    });

    // S3 Deployment
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // 出力
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: `${config.appName}-${config.environment}-frontend-bucket`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${config.appName}-${config.environment}-distribution-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${config.appName}-${config.environment}-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Frontend URL',
      exportName: `${config.appName}-${config.environment}-frontend-url`,
    });

    // タグ付け
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}