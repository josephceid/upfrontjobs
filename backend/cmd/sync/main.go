package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"upfrontjobs.co.uk/backend/internal/models"
	"upfrontjobs.co.uk/backend/internal/reed"
	"upfrontjobs.co.uk/backend/internal/store"
)

const ttlDays = 90

func handler(ctx context.Context) error {
	tableName := os.Getenv("DYNAMODB_TABLE_NAME")
	if tableName == "" {
		return fmt.Errorf("DYNAMODB_TABLE_NAME env var not set")
	}
	secretName := os.Getenv("REED_SECRET_NAME")
	if secretName == "" {
		secretName = "reed-api-key"
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return fmt.Errorf("load AWS config: %w", err)
	}

	// Retrieve Reed API key from Secrets Manager.
	sm := secretsmanager.NewFromConfig(cfg)
	secretOut, err := sm.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: &secretName,
	})
	if err != nil {
		return fmt.Errorf("get secret %q: %w", secretName, err)
	}

	apiKey, err := extractAPIKey(secretOut.SecretString)
	if err != nil {
		return fmt.Errorf("extract API key: %w", err)
	}

	// Fetch salary-declared jobs from Reed.
	client := reed.New(apiKey)
	log.Println("fetching jobs from Reed API...")
	reedJobs, err := client.FetchAllSalaryJobs()
	if err != nil {
		return fmt.Errorf("fetch reed jobs: %w", err)
	}
	log.Printf("fetched %d salary-declared jobs from Reed", len(reedJobs))

	// Write new jobs to DynamoDB.
	db := dynamodb.NewFromConfig(cfg)
	st := store.New(db, tableName)

	ttlTime := time.Now().Add(ttlDays * 24 * time.Hour).Unix()
	added, skipped := 0, 0

	for _, rj := range reedJobs {
		jobID := strconv.Itoa(rj.JobID)

		exists, err := st.Exists(ctx, jobID)
		if err != nil {
			log.Printf("warn: checking existence of job %s: %v", jobID, err)
			continue
		}
		if exists {
			skipped++
			continue
		}

		currency := rj.Currency
		if currency == "" {
			currency = "GBP"
		}

		job := models.Job{
			JobID:          jobID,
			JobTitle:       rj.JobTitle,
			EmployerName:   rj.EmployerName,
			EmployerID:     strconv.Itoa(rj.EmployerID),
			LocationName:   rj.LocationName,
			MinimumSalary:  *rj.MinimumSalary,
			MaximumSalary:  *rj.MaximumSalary,
			Currency:       currency,
			JobDescription: rj.JobDescription,
			JobURL:         rj.JobURL,
			DatePosted:     rj.Date,
			ExpirationDate: rj.ExpirationDate,
			Source:         "reed",
			CreatedAt:      ttlTime,
		}

		if err := st.Put(ctx, job); err != nil {
			log.Printf("warn: writing job %s: %v", jobID, err)
			continue
		}
		added++
	}

	log.Printf("sync complete: added=%d skipped=%d", added, skipped)
	return nil
}

// extractAPIKey handles both plain-string secrets and JSON-wrapped ones
// (e.g. {"api_key": "..."}).
func extractAPIKey(secretString *string) (string, error) {
	if secretString == nil {
		return "", fmt.Errorf("secret string is nil")
	}
	raw := *secretString

	// Try JSON object first.
	var m map[string]string
	if err := json.Unmarshal([]byte(raw), &m); err == nil {
		for _, k := range []string{"api_key", "apiKey", "REED_API_KEY", "key"} {
			if v, ok := m[k]; ok && v != "" {
				return v, nil
			}
		}
		// If it's a JSON object but none of the expected keys matched, return first value.
		for _, v := range m {
			if v != "" {
				return v, nil
			}
		}
	}

	// Treat as plain string.
	if raw != "" {
		return raw, nil
	}
	return "", fmt.Errorf("could not extract API key from secret")
}

func main() {
	lambda.Start(handler)
}
