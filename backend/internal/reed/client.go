package reed

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	baseURL       = "https://www.reed.co.uk/api/1.0"
	pageSize      = 100
	requestDelay  = 500 * time.Millisecond
)

// Client is a Reed API client.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// ReedJob is the raw job shape returned by the Reed API.
type ReedJob struct {
	JobID          int      `json:"jobId"`
	JobTitle       string   `json:"jobTitle"`
	EmployerName   string   `json:"employerName"`
	EmployerID     int      `json:"employerId"`
	LocationName   string   `json:"locationName"`
	MinimumSalary  *float64 `json:"minimumSalary"`
	MaximumSalary  *float64 `json:"maximumSalary"`
	Currency       string   `json:"currency"`
	JobDescription string   `json:"jobDescription"`
	JobURL         string   `json:"jobUrl"`
	Date           string   `json:"date"`
	ExpirationDate string   `json:"expirationDate"`
}

type searchResponse struct {
	Results []ReedJob `json:"results"`
	Total   int       `json:"total"`
}

// New creates a Reed API client.
func New(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// FetchAllSalaryJobs pages through the Reed API and returns every job that
// has both minimumSalary and maximumSalary declared.
func (c *Client) FetchAllSalaryJobs() ([]ReedJob, error) {
	var all []ReedJob
	skip := 0

	for {
		batch, total, err := c.search(skip)
		if err != nil {
			return nil, fmt.Errorf("reed search (skip=%d): %w", skip, err)
		}

		for _, j := range batch {
			if j.MinimumSalary != nil && j.MaximumSalary != nil &&
				*j.MinimumSalary > 0 && *j.MaximumSalary > 0 {
				all = append(all, j)
			}
		}

		skip += len(batch)
		if skip >= total || len(batch) == 0 {
			break
		}

		time.Sleep(requestDelay)
	}

	return all, nil
}

func (c *Client) search(skip int) ([]ReedJob, int, error) {
	params := url.Values{}
	params.Set("resultsToTake", strconv.Itoa(pageSize))
	params.Set("resultsToSkip", strconv.Itoa(skip))
	// minimumSalary=1 tells Reed to only return jobs with a stated salary,
	// reducing response size before our own null-check filter.
	params.Set("minimumSalary", "1")

	reqURL := fmt.Sprintf("%s/search?%s", baseURL, params.Encode())

	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.SetBasicAuth(c.apiKey, "")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("reed API returned status %d", resp.StatusCode)
	}

	var result searchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, 0, fmt.Errorf("decode reed response: %w", err)
	}

	return result.Results, result.Total, nil
}
