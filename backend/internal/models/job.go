package models

// Job represents a job listing stored in DynamoDB.
type Job struct {
	JobID          string  `json:"jobId" dynamodbav:"jobId"`
	JobTitle       string  `json:"jobTitle" dynamodbav:"jobTitle"`
	EmployerName   string  `json:"employerName" dynamodbav:"employerName"`
	EmployerID     string  `json:"employerId" dynamodbav:"employerId"`
	LocationName   string  `json:"locationName" dynamodbav:"locationName"`
	MinimumSalary  float64 `json:"minimumSalary" dynamodbav:"minimumSalary"`
	MaximumSalary  float64 `json:"maximumSalary" dynamodbav:"maximumSalary"`
	Currency       string  `json:"currency" dynamodbav:"currency"`
	JobDescription string  `json:"jobDescription" dynamodbav:"jobDescription"`
	JobURL         string  `json:"jobUrl" dynamodbav:"jobUrl"`
	DatePosted     string  `json:"datePosted" dynamodbav:"datePosted"`
	ExpirationDate string  `json:"expirationDate" dynamodbav:"expirationDate"`
	Source         string  `json:"source" dynamodbav:"source"`
	CreatedAt      int64   `json:"createdAt" dynamodbav:"createdAt"` // Unix epoch, used as DynamoDB TTL
}

// JobsResponse is the paginated list response from the API.
type JobsResponse struct {
	Jobs     []Job `json:"jobs"`
	Total    int   `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}
