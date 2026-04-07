# upfrontjobs.co.uk

A job board that only shows listings with declared salary ranges.

## Project Structure

```
/
├── frontend/          # Next.js 15 app (App Router, TypeScript, Tailwind)
├── backend/           # Go Lambda functions
│   ├── cmd/sync/      # Reed API sync (runs every 6 hours via EventBridge)
│   └── cmd/api/       # API Gateway Lambda (GET /jobs, GET /jobs/{jobId})
├── infrastructure/    # AWS CDK (TypeScript)
└── README.md
```

## Prerequisites

- Go 1.23+
- Node.js 20+
- AWS CLI configured for `eu-west-2`
- Docker (for CDK bundling of Go lambdas)
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

### 1. AWS Secrets Manager

Store your Reed API key before deploying:

```bash
aws secretsmanager create-secret \
  --name reed-api-key \
  --secret-string "YOUR_REED_API_KEY" \
  --region eu-west-2
```

### 2. Backend (Go)

```bash
cd backend
go mod tidy
```

To build lambda binaries locally (optional — CDK bundles automatically):

```bash
make build
```

### 3. Infrastructure (CDK — Go)

```bash
cd infrastructure
go mod tidy
cdk bootstrap aws://ACCOUNT_ID/eu-west-2   # first time only
cdk deploy
```

The CDK stack outputs the API Gateway URL. Set it as `NEXT_PUBLIC_API_URL` in your frontend.

### 4. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your API Gateway URL
npm run dev
```

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `REED_API_KEY` | AWS Secrets Manager (`reed-api-key`) | Reed API key |
| `DYNAMODB_TABLE_NAME` | Lambda env var (set by CDK) | DynamoDB table name |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | API Gateway base URL |

## Architecture

- **Sync Lambda**: Runs every 6 hours via EventBridge. Fetches jobs from Reed API, filters to salary-declared listings only, stores in DynamoDB with a 90-day TTL.
- **API Lambda**: HTTP API Gateway proxy. Supports paginated job search with keyword/location/salary filters.
- **Frontend**: Next.js 15 with ISR (6-hour revalidation). Job detail pages are statically generated with JSON-LD structured data for SEO.

## Deployment

```bash
cd infrastructure && cdk deploy
cd frontend && npm run build
```

## Attribution

Job listings powered by [Reed](https://www.reed.co.uk).
