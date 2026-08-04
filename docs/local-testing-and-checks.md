# Local Testing And Checks (No Copilot Credits)

This guide explains how to run project checks directly in your own terminal.

Running these commands yourself does not use Copilot chat credits. They run on your machine with Node, npm, curl, and your local project files.

## Prerequisites

- Node.js installed
- npm installed
- Backend running on port 4000
- Frontend running on port 5173

Start services if needed:

- Backend:
  - cd backend
  - npm run dev
- Frontend:
  - cd frontend
  - npm run dev -- --host 127.0.0.1 --port 5173

## Quick Smoke Checks

From the repository root:

- Frontend smoke check:
  - node scripts/smoke-frontend-check.js
- API smoke check (includes calculate-cost check on first available job):
  - node scripts/smoke-api-check.js

These checks fail with a non-zero exit code if something is broken.

## Npm Script Shortcuts

Run from each package folder:

- Backend:
  - cd backend
  - npm run check:api-smoke
  - npm run check:local
- Frontend:
  - cd frontend
  - npm run check:frontend-smoke
  - npm run check:local

What check:local includes:

- smoke check
- tracker consistency check
- quality cadence check
- release-note check

## One-Command Full Check

From repository root:

- bash scripts/run-local-checks.sh

Optional:

- chmod +x scripts/run-local-checks.sh
- ./scripts/run-local-checks.sh

## Custom Endpoints

You can target non-default local addresses with environment variables:

- API check:
  - API_BASE=http://127.0.0.1:4001 node scripts/smoke-api-check.js
- Frontend check:
  - FRONTEND_BASE=http://127.0.0.1:5174 node scripts/smoke-frontend-check.js

## Troubleshooting

- Backend not reachable:
  - curl http://127.0.0.1:4000/api/health
- Frontend not reachable:
  - curl http://127.0.0.1:5173
- Port in use:
  - stop old processes on 4000 and 5173, then restart both services
- No jobs available:
  - API smoke check still passes endpoint checks and skips calculate-cost until at least one job exists
