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

## Backup And Restore Test Matrix

Run these from repository root while backend is running on port 4000.

Expected result for restore calls:

- HTTP status 200
- JSON contains restored: true

Create a temporary test folder:

- mkdir -p /tmp/laser-backup-checks

### 1) Full Backup Export And Restore

- Export full backup JSON:
  - curl -sS http://127.0.0.1:4000/api/admin/backup/full -o /tmp/laser-backup-checks/full-backup.json
- Check file is not empty:
  - wc -c /tmp/laser-backup-checks/full-backup.json
- Restore full backup from exported file:
  - curl -sS -H "Content-Type: application/json" -X POST http://127.0.0.1:4000/api/admin/backup/full --data-binary @/tmp/laser-backup-checks/full-backup.json

What to verify in response:

- restored is true
- jobsCount and materialsCount are present
- If billingSettingsRestored is false, run backend Prisma migrate and generate, restart backend, then retry

### 2) Jobs And Materials Backup Export And Restore

- Export jobs and materials backup JSON:
  - curl -sS http://127.0.0.1:4000/api/admin/backup -o /tmp/laser-backup-checks/jobs-materials-backup.json
- Restore jobs and materials backup:
  - curl -sS -H "Content-Type: application/json" -X POST http://127.0.0.1:4000/api/admin/backup --data-binary @/tmp/laser-backup-checks/jobs-materials-backup.json

### 3) Customers Backup Export And Restore

- Export customers backup:
  - curl -sS http://127.0.0.1:4000/api/admin/backup/customers -o /tmp/laser-backup-checks/customers-backup.json
- Restore customers backup:
  - curl -sS -H "Content-Type: application/json" -X POST http://127.0.0.1:4000/api/admin/backup/customers --data-binary @/tmp/laser-backup-checks/customers-backup.json

### 4) Suppliers And Purchases Backup Export And Restore

- Export suppliers backup:
  - curl -sS http://127.0.0.1:4000/api/admin/backup/suppliers -o /tmp/laser-backup-checks/suppliers-backup.json
- Restore suppliers backup:
  - curl -sS -H "Content-Type: application/json" -X POST http://127.0.0.1:4000/api/admin/backup/suppliers --data-binary @/tmp/laser-backup-checks/suppliers-backup.json

### 5) Machines And Bambu Backup Export And Restore

- Export machines backup:
  - curl -sS http://127.0.0.1:4000/api/admin/backup/machines -o /tmp/laser-backup-checks/machines-backup.json
- Restore machines backup:
  - curl -sS -H "Content-Type: application/json" -X POST http://127.0.0.1:4000/api/admin/backup/machines --data-binary @/tmp/laser-backup-checks/machines-backup.json

### 6) Billing Backup Export And Restore

- Export billing backup:
  - curl -sS http://127.0.0.1:4000/api/admin/backup/billing -o /tmp/laser-backup-checks/billing-backup.json
- Restore billing backup:
  - curl -sS -H "Content-Type: application/json" -X POST http://127.0.0.1:4000/api/admin/backup/billing --data-binary @/tmp/laser-backup-checks/billing-backup.json

### 7) Quick Status-Code Sweep For All Backup Endpoints

- Run this one-liner to confirm endpoint health:
  - for p in /api/admin/backup /api/admin/backup/full /api/admin/backup/customers /api/admin/backup/suppliers /api/admin/backup/machines /api/admin/backup/billing; do echo "$p"; curl -s -o /dev/null -w "HTTP:%{http_code}\n" "http://127.0.0.1:4000$p"; done

### 8) Restore Failure Debug Checklist

- If restore returns 503 or mentions schema mismatch:
  - cd backend
  - npm run prisma -- migrate deploy
  - npm run prisma -- generate
  - restart backend and retry
- If restore returns 500:
  - check backend terminal for the exact Prisma or payload error
  - validate JSON file was exported from the same app family and is not truncated
- If curl reports empty reply:
  - backend process likely crashed, restart and rerun the test

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
