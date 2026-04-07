package store

import (
	"context"
	"fmt"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"upfrontjobs.co.uk/backend/internal/models"
)

// Store wraps DynamoDB operations for the jobs table.
type Store struct {
	client    *dynamodb.Client
	tableName string
}

// New creates a Store backed by the given DynamoDB client.
func New(client *dynamodb.Client, tableName string) *Store {
	return &Store{client: client, tableName: tableName}
}

// Exists returns true if a job with the given jobId is already in the table.
func (s *Store) Exists(ctx context.Context, jobID string) (bool, error) {
	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.tableName),
		Key: map[string]types.AttributeValue{
			"jobId": &types.AttributeValueMemberS{Value: jobID},
		},
		ProjectionExpression: aws.String("jobId"),
	})
	if err != nil {
		return false, fmt.Errorf("dynamodb GetItem: %w", err)
	}
	return out.Item != nil, nil
}

// Put writes a job to DynamoDB. It does not check for duplicates; call
// Exists first if needed.
func (s *Store) Put(ctx context.Context, job models.Job) error {
	item, err := attributevalue.MarshalMap(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}

	_, err = s.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(s.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(jobId)"),
	})
	if err != nil {
		// Ignore ConditionalCheckFailedException — job already exists.
		var ccfe *types.ConditionalCheckFailedException
		if isType(err, &ccfe) {
			return nil
		}
		return fmt.Errorf("dynamodb PutItem: %w", err)
	}
	return nil
}

// ListJobs returns a paginated, optionally-filtered list of jobs.
// For Phase 1 this uses a Scan; add GSIs later for scale.
func (s *Store) ListJobs(ctx context.Context, keyword, location string, minSalary, maxSalary float64, page, pageSize int) ([]models.Job, int, error) {
	input := &dynamodb.ScanInput{
		TableName: aws.String(s.tableName),
	}

	var filterParts []string
	exprAttrNames := map[string]string{}
	exprAttrVals := map[string]types.AttributeValue{}

	if keyword != "" {
		filterParts = append(filterParts, "contains(#title, :kw) OR contains(#desc, :kw)")
		exprAttrNames["#title"] = "jobTitle"
		exprAttrNames["#desc"] = "jobDescription"
		exprAttrVals[":kw"] = &types.AttributeValueMemberS{Value: keyword}
	}
	if location != "" {
		filterParts = append(filterParts, "contains(#loc, :loc)")
		exprAttrNames["#loc"] = "locationName"
		exprAttrVals[":loc"] = &types.AttributeValueMemberS{Value: location}
	}
	if minSalary > 0 {
		filterParts = append(filterParts, "maximumSalary >= :minSal")
		exprAttrVals[":minSal"] = &types.AttributeValueMemberN{Value: strconv.FormatFloat(minSalary, 'f', 2, 64)}
	}
	if maxSalary > 0 {
		filterParts = append(filterParts, "minimumSalary <= :maxSal")
		exprAttrVals[":maxSal"] = &types.AttributeValueMemberN{Value: strconv.FormatFloat(maxSalary, 'f', 2, 64)}
	}

	if len(filterParts) > 0 {
		expr := filterParts[0]
		for _, p := range filterParts[1:] {
			expr += " AND " + p
		}
		input.FilterExpression = aws.String(expr)
	}
	if len(exprAttrNames) > 0 {
		input.ExpressionAttributeNames = exprAttrNames
	}
	if len(exprAttrVals) > 0 {
		input.ExpressionAttributeValues = exprAttrVals
	}

	// Collect all matching items then paginate in memory.
	// For Phase 1 scale this is acceptable; replace with a GSI + Query for production.
	var allItems []models.Job
	paginator := dynamodb.NewScanPaginator(s.client, input)
	for paginator.HasMorePages() {
		page_, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, 0, fmt.Errorf("scan: %w", err)
		}
		var batch []models.Job
		if err := attributevalue.UnmarshalListOfMaps(page_.Items, &batch); err != nil {
			return nil, 0, fmt.Errorf("unmarshal: %w", err)
		}
		allItems = append(allItems, batch...)
	}

	total := len(allItems)
	start := (page - 1) * pageSize
	if start >= total {
		return []models.Job{}, total, nil
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return allItems[start:end], total, nil
}

// GetJob returns a single job by ID.
func (s *Store) GetJob(ctx context.Context, jobID string) (*models.Job, error) {
	out, err := s.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.tableName),
		Key: map[string]types.AttributeValue{
			"jobId": &types.AttributeValueMemberS{Value: jobID},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("dynamodb GetItem: %w", err)
	}
	if out.Item == nil {
		return nil, nil
	}
	var job models.Job
	if err := attributevalue.UnmarshalMap(out.Item, &job); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}
	return &job, nil
}

// isType checks whether err (or any wrapped error) matches the target type.
func isType(err error, target interface{}) bool {
	// Simple type assertion — sufficient for ConditionalCheckFailedException.
	switch target.(type) {
	case **types.ConditionalCheckFailedException:
		_, ok := err.(*types.ConditionalCheckFailedException)
		return ok
	}
	return false
}
