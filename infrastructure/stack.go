package main

import (
	"path/filepath"
	"runtime"

	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsapigatewayv2integrations"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsdynamodb"
	"github.com/aws/aws-cdk-go/awscdk/v2/awslambda"
	"github.com/aws/aws-cdk-go/awscdklambdagoalpha/v2"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// backendPath returns an absolute path relative to this source file,
// so `cdk deploy` works regardless of the working directory.
func backendPath(rel string) *string {
	_, filename, _, _ := runtime.Caller(0)
	abs := filepath.Join(filepath.Dir(filename), "..", "backend", rel)
	return jsii.String(abs)
}

func NewUpfrontJobsStack(scope constructs.Construct, id string, props *awscdk.StackProps) awscdk.Stack {
	stack := awscdk.NewStack(scope, &id, props)

	// ── DynamoDB ────────────────────────────────────────────────────────────
	jobsTable := awsdynamodb.NewTable(stack, jsii.String("JobsTable"), &awsdynamodb.TableProps{
		TableName:           jsii.String("jobs"),
		PartitionKey:        &awsdynamodb.Attribute{Name: jsii.String("jobId"), Type: awsdynamodb.AttributeType_STRING},
		BillingMode:         awsdynamodb.BillingMode_PAY_PER_REQUEST,
		TimeToLiveAttribute: jsii.String("createdAt"),
		RemovalPolicy:       awscdk.RemovalPolicy_RETAIN,
		PointInTimeRecovery: jsii.Bool(true),
	})

	// ── API Lambda ───────────────────────────────────────────────────────────
	apiFn := awscdklambdagoalpha.NewGoFunction(stack, jsii.String("ApiFunction"), &awscdklambdagoalpha.GoFunctionProps{
		Entry:        backendPath("cmd/api"),
		Architecture: awslambda.Architecture_ARM_64(),
		Timeout:      awscdk.Duration_Seconds(jsii.Number(30)),
		MemorySize:   jsii.Number(128),
		Environment: &map[string]*string{
			"DYNAMODB_TABLE_NAME": jobsTable.TableName(),
		},
		FunctionName: jsii.String("upfrontjobs-api"),
		Description:  jsii.String("HTTP API for upfrontjobs job listings"),
	})

	jobsTable.GrantReadData(apiFn)

	// ── HTTP API Gateway (v2) ────────────────────────────────────────────────
	httpApi := awsapigatewayv2.NewHttpApi(stack, jsii.String("HttpApi"), &awsapigatewayv2.HttpApiProps{
		ApiName:     jsii.String("upfrontjobs-api"),
		Description: jsii.String("upfrontjobs.co.uk API"),
		CorsPreflight: &awsapigatewayv2.CorsPreflightOptions{
			AllowOrigins: &[]*string{
				jsii.String("https://upfrontjobs.co.uk"),
				jsii.String("http://localhost:3000"),
			},
			AllowMethods: &[]awsapigatewayv2.CorsHttpMethod{
				awsapigatewayv2.CorsHttpMethod_GET,
				awsapigatewayv2.CorsHttpMethod_OPTIONS,
			},
			AllowHeaders: &[]*string{jsii.String("Content-Type")},
			MaxAge:       awscdk.Duration_Hours(jsii.Number(1)),
		},
	})

	apiIntegration := awsapigatewayv2integrations.NewHttpLambdaIntegration(
		jsii.String("ApiIntegration"), apiFn, nil,
	)

	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/jobs"),
		Methods:     &[]awsapigatewayv2.HttpMethod{awsapigatewayv2.HttpMethod_GET},
		Integration: apiIntegration,
	})

	httpApi.AddRoutes(&awsapigatewayv2.AddRoutesOptions{
		Path:        jsii.String("/jobs/{jobId}"),
		Methods:     &[]awsapigatewayv2.HttpMethod{awsapigatewayv2.HttpMethod_GET},
		Integration: apiIntegration,
	})

	// ── Outputs ──────────────────────────────────────────────────────────────
	awscdk.NewCfnOutput(stack, jsii.String("ApiUrl"), &awscdk.CfnOutputProps{
		Description: jsii.String("API Gateway base URL — set as NEXT_PUBLIC_API_URL in the frontend"),
		Value:       httpApi.ApiEndpoint(),
	})

	awscdk.NewCfnOutput(stack, jsii.String("JobsTableName"), &awscdk.CfnOutputProps{
		Description: jsii.String("DynamoDB jobs table name"),
		Value:       jobsTable.TableName(),
	})

	return stack
}
