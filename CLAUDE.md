# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)
```bash
cd frontend
npm run dev        # start dev server on :3000
npm run build      # production build
npm run lint       # ESLint
```

### Backend (Go Lambdas)
```bash
cd backend
make build         # compile all Lambdas to dist/
make build-api     # compile only the API Lambda
go test ./...      # run all tests
go test ./internal/store/... # run a specific package's tests
go mod tidy        # clean up dependencies
```

### Infrastructure (AWS CDK)
```bash
cd infrastructure
cdk diff           # preview changes
cdk deploy         # deploy stack to eu-west-2
cdk synth          # generate CloudFormation template
```

## Architecture

Three independent sub-projects in one repo: `frontend/`, `backend/`, `infrastructure/`. They share no code — the frontend talks to the backend only over HTTP.

### Request flow
```
Browser → Next.js (Vercel/SSR) → AWS API Gateway (HTTP v2) → Go Lambda → DynamoDB
```

### Backend (`backend/`)
- Module: `upfrontjobs.co.uk/backend`
- Each Lambda is a `cmd/<name>/main.go` that registers a handler with `lambda.Start()`.
- Currently one Lambda: `cmd/api` — handles `GET /jobs` and `GET /jobs/{jobId}`.
- Shared packages under `internal/`:
  - `internal/models/job.go` — `Job` and `JobsResponse` structs with `dynamodbav` tags.
  - `internal/store/dynamo.go` — `Store` wrapping DynamoDB; `ListJobs` uses a full-table Scan with in-memory pagination (acceptable for Phase 1 scale).
- Lambdas compile to `dist/<name>/bootstrap` (ARM64 Linux) via `make build-<name>`.

### Infrastructure (`infrastructure/`)
- Go CDK app (`go run .`) targeting `eu-west-2`.
- All resources are in a single stack defined in `stack.go`.
- Key resources: DynamoDB `jobs` table (PAY_PER_REQUEST, TTL on `createdAt`, RETAIN policy), API Lambda, HTTP API Gateway v2 with CORS.
- `backendPath()` resolves Lambda entry points relative to the source file so `cdk deploy` works from any directory.
- After deploy, set `NEXT_PUBLIC_API_URL` in the frontend to the `ApiUrl` CDK output.

### Frontend (`frontend/`)
- Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS v3.
- Path alias `@/*` maps to the project root.
- **Server components by default.** Only `JobSearch` is a client component (uses `useRouter`/`useTransition`).
- Pages use `export const revalidate` for ISR (6-hour revalidation on listings and job detail).
- `lib/api.ts` — typed fetch wrappers for the Go API; reads `NEXT_PUBLIC_API_URL`.
- `lib/utils.ts` — `slugify`, `formatSalary`, `formatDate` helpers.
- Job detail URLs are `/jobs/[jobId]/[slug]` — `jobId` is the DynamoDB key, `slug` is cosmetic.
- Brand colour (`#16a34a` green) is configured as `brand.*` in `tailwind.config.ts`; use `brand-600` as the primary interactive colour throughout.

### Environment variables
| Variable | Where set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | API Gateway base URL |
| `DYNAMODB_TABLE_NAME` | CDK → Lambda env | DynamoDB table name |
| `JWT_SECRET` | frontend `.env.local` | Verify auth JWTs in middleware |
