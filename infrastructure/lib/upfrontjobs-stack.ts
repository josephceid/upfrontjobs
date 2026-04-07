import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';

export class UpfrontJobsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── DynamoDB ────────────────────────────────────────────────────────────
    const jobsTable = new dynamodb.Table(this, 'JobsTable', {
      tableName: 'jobs',
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'createdAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // ── Secrets Manager reference ────────────────────────────────────────────
    // The secret must already exist: aws secretsmanager create-secret --name reed-api-key ...
    const reedSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'ReedApiKey',
      'reed-api-key',
    );

    // ── Shared Lambda config ─────────────────────────────────────────────────
    const commonLambdaProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      architecture: lambda.Architecture.ARM_64,
      handler: 'bootstrap',
    };

    // ── Sync Lambda ──────────────────────────────────────────────────────────
    const syncFn = new lambda.Function(this, 'SyncFunction', {
      ...commonLambdaProps,
      functionName: 'upfrontjobs-sync',
      description: 'Fetches salary-declared jobs from Reed API and stores them in DynamoDB',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
        bundling: {
          image: lambda.Runtime.PROVIDED_AL2023.bundlingImage,
          command: [
            'bash', '-c',
            [
              'export GOPATH=/tmp/go',
              'export GOCACHE=/tmp/gocache',
              'export GOARCH=arm64',
              'export GOOS=linux',
              'export CGO_ENABLED=0',
              'go build -tags lambda.norpc -ldflags "-s -w" -o /asset-output/bootstrap ./cmd/sync',
            ].join(' && '),
          ],
          environment: {
            GOARCH: 'arm64',
            GOOS: 'linux',
            CGO_ENABLED: '0',
          },
        },
      }),
      timeout: cdk.Duration.minutes(10),
      memorySize: 256,
      environment: {
        DYNAMODB_TABLE_NAME: jobsTable.tableName,
        REED_SECRET_NAME: 'reed-api-key',
      },
    });

    jobsTable.grantReadWriteData(syncFn);
    reedSecret.grantRead(syncFn);

    // EventBridge rule — runs every 6 hours.
    const syncRule = new events.Rule(this, 'SyncSchedule', {
      ruleName: 'upfrontjobs-sync-schedule',
      description: 'Triggers Reed sync Lambda every 6 hours',
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
    });
    syncRule.addTarget(new targets.LambdaFunction(syncFn));

    // ── API Lambda ───────────────────────────────────────────────────────────
    const apiFn = new lambda.Function(this, 'ApiFunction', {
      ...commonLambdaProps,
      functionName: 'upfrontjobs-api',
      description: 'HTTP API for upfrontjobs job listings',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
        bundling: {
          image: lambda.Runtime.PROVIDED_AL2023.bundlingImage,
          command: [
            'bash', '-c',
            [
              'export GOPATH=/tmp/go',
              'export GOCACHE=/tmp/gocache',
              'export GOARCH=arm64',
              'export GOOS=linux',
              'export CGO_ENABLED=0',
              'go build -tags lambda.norpc -ldflags "-s -w" -o /asset-output/bootstrap ./cmd/api',
            ].join(' && '),
          ],
          environment: {
            GOARCH: 'arm64',
            GOOS: 'linux',
            CGO_ENABLED: '0',
          },
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      environment: {
        DYNAMODB_TABLE_NAME: jobsTable.tableName,
      },
    });

    jobsTable.grantReadData(apiFn);

    // ── HTTP API Gateway (v2) ────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'upfrontjobs-api',
      description: 'upfrontjobs.co.uk API',
      corsPreflight: {
        allowOrigins: ['https://upfrontjobs.co.uk', 'http://localhost:3000'],
        allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    const apiIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      'ApiIntegration',
      apiFn,
    );

    httpApi.addRoutes({
      path: '/jobs',
      methods: [apigwv2.HttpMethod.GET],
      integration: apiIntegration,
    });

    httpApi.addRoutes({
      path: '/jobs/{jobId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: apiIntegration,
    });

    // ── Outputs ──────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      description: 'API Gateway base URL — set as NEXT_PUBLIC_API_URL in the frontend',
      value: httpApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, 'JobsTableName', {
      description: 'DynamoDB jobs table name',
      value: jobsTable.tableName,
    });
  }
}
