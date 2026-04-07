package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"upfrontjobs.co.uk/backend/internal/store"
)

const defaultPageSize = 20

var st *store.Store

func init() {
	tableName := os.Getenv("DYNAMODB_TABLE_NAME")
	if tableName == "" {
		panic("DYNAMODB_TABLE_NAME env var not set")
	}

	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		panic(fmt.Sprintf("load AWS config: %v", err))
	}

	db := dynamodb.NewFromConfig(cfg)
	st = store.New(db, tableName)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	path := req.RawPath
	method := req.RequestContext.HTTP.Method

	if method != http.MethodGet {
		return respond(http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}

	// Route: GET /jobs/{jobId}
	if strings.HasPrefix(path, "/jobs/") {
		jobID := strings.TrimPrefix(path, "/jobs/")
		if jobID != "" && !strings.Contains(jobID, "/") {
			return handleGetJob(ctx, jobID)
		}
	}

	// Route: GET /jobs
	if path == "/jobs" || path == "/jobs/" {
		return handleListJobs(ctx, req.QueryStringParameters)
	}

	return respond(http.StatusNotFound, map[string]string{"error": "not found"})
}

func handleListJobs(ctx context.Context, params map[string]string) (events.APIGatewayV2HTTPResponse, error) {
	keyword := params["keyword"]
	location := params["location"]
	minSalary := parseFloat(params["minSalary"])
	maxSalary := parseFloat(params["maxSalary"])
	page := parseInt(params["page"], 1)
	pageSize := parseInt(params["pageSize"], defaultPageSize)

	if pageSize > 100 {
		pageSize = 100
	}
	if page < 1 {
		page = 1
	}

	jobs, total, err := st.ListJobs(ctx, keyword, location, minSalary, maxSalary, page, pageSize)
	if err != nil {
		return respond(http.StatusInternalServerError, map[string]string{"error": "internal error"})
	}

	return respond(http.StatusOK, map[string]interface{}{
		"jobs":     jobs,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func handleGetJob(ctx context.Context, jobID string) (events.APIGatewayV2HTTPResponse, error) {
	job, err := st.GetJob(ctx, jobID)
	if err != nil {
		return respond(http.StatusInternalServerError, map[string]string{"error": "internal error"})
	}
	if job == nil {
		return respond(http.StatusNotFound, map[string]string{"error": "job not found"})
	}
	return respond(http.StatusOK, map[string]interface{}{"job": job})
}

func respond(status int, body interface{}) (events.APIGatewayV2HTTPResponse, error) {
	b, _ := json.Marshal(body)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: status,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Methods": "GET,OPTIONS",
		},
		Body: string(b),
	}, nil
}

func parseFloat(s string) float64 {
	if s == "" {
		return 0
	}
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func parseInt(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

func main() {
	lambda.Start(handler)
}
