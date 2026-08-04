#!/usr/bin/env bash
set -euo pipefail

echo "Running full local checks"

echo "1/5 Frontend smoke"
node scripts/smoke-frontend-check.js

echo "2/5 API smoke"
node scripts/smoke-api-check.js

echo "3/5 Tracker consistency"
node scripts/check-tracker-consistency.js

echo "4/5 Quality cadence"
node scripts/check-quality-cadence.js

echo "5/5 Release-note check"
node scripts/check-release-notes.js

echo "All local checks passed"
