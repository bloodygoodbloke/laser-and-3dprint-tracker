Markdown: Open Preview to the Side (New Editor)# laser-and-3dprint-tracker

Fabrication Workshop Tracker is a lightweight system for managing jobs, materials, and usage in small-scale fabrication environments such as makerspaces, fabrication labs, and small production shops.

**Industry context**
- Used by makerspaces, education labs, and small manufacturers to track machine time, material consumption, and job status.
- Helps with cost allocation, accountability, and inventory control where multiple users share equipment (laser cutters, SLA/DLP/SLS printers, FDM printers).
- Supports safety and compliance workflows by keeping a record of who ran what job and when — useful for liability tracking and maintenance schedules.

**Key benefits**
- Accurate materials accounting and low-volume inventory management.
- Job tracking for scheduling and prioritization of equipment use.
- Simple auditing of prints and cuts for cost-recovery or chargeback models.
- Central pricing controls for customer invoicing and markup-based billing.

**Current functionality**
- Manage jobs with customer details, machine type, machine runtime, and separate labour time.
- Support quote lifecycle and conversion with statuses (`Quote Draft`, `Quote Sent`, `Quote Approved`) and one-click conversion to active jobs.
- New customer names entered during job creation can be captured immediately in a CRM Lite details popup.
- Create jobs directly from the Jobs tab, edit existing jobs directly under the selected expanded job card, and delete jobs from expandable job card actions.
- Use Jobs tab search plus status/machine filters to quickly narrow job lists.
- Job cards now show internal base total, customer total, and profit visibility without exposing these internal figures on customer invoices.
- Plan machine queues with queue positions, due dates, and risk indicators (`On track`, `Watch`, `At risk`, `Overdue`).
- Use the Dashboard scheduling calendar to view a rolling 14-day due-date plan with projected completion timestamps by machine queue.
- Capture QA checklist items, QA pass/fail status, and rework costs/notes per job with cost impact tracking.
- Add multi-material usage per job with simplified material selection plus quantity in grams.
- Upload SVG/STL job files from expanded job cards and preview them inline directly in job detail.
- Track materials with colour, grouped material-type views, and quick copy/edit workflows.
- Material creation/editing is managed in the Materials tab (Admin no longer contains a duplicate add-material form).
- Manage CRM Lite customer records (name, address, email, phone, notes) with recent order history lookup.
- Manage supplier records and material purchase history (material, quantity, cost, date, notes) from a dedicated Suppliers tab.
- Track margin reporting by machine, material type, and customer from the Reports page.
- Monitor delivery and utilization KPIs including on-time rate, overdue open jobs, queued runtime, and per-machine utilization.
- Use a dedicated Reports page with date-range, status, machine, and customer filters plus CSV export-ready report rows, summary metrics, and margin breakdown views.
- Use the Help page as an in-app guide and raise bug/feature requests directly from the app. Submissions are queued in a separate help-intake workflow so users can download one combined JSON file and email it to the backlog owner.
- Monitor Bambu machine live status (nozzle/bed/chamber temperatures, progress, AMS summary) from the Bambu telemetry section in the Machines tab.
- Process Bambu event-driven updates (`PRINT_STARTED`, `PRINT_FINISHED`, `PRINT_FAILED`) to auto-update linked job statuses.
- Auto-log runtime/material telemetry usage, auto-deduct linked job material stock, and auto-adjust AMS spool levels from telemetry events.
- Track open failure logs from Bambu error states and view an event stream for recent telemetry actions.
- Generate predictive maintenance risk indicators from accumulated machine usage hours and recent error frequency.
- Import MakerWorld model metadata (title/description/preview/tags plus estimated runtime and grams hints) directly from a MakerWorld URL.
- Autofill new job creation from MakerWorld URLs to pre-populate name, timing defaults, and suggested material usage, while saving the model URL on the job for future reference.
- Import MakerWorld print profile hints (layer, nozzle/bed temps, speed, infill) to support faster costing estimation setup.
- Manage machine profiles from a dedicated Machines tab with add/edit/remove workflows.
- Calculate production costs for 3D and laser workflows using machine runtime electricity + depreciation plus separate labour-time charging.
- Configure billing rules for percentage markups, electricity, labour rate, workshop hourly rate, per-machine wattage/depreciation assumptions, and invoice add-ons (delivery + VAT).
- Use the dedicated Billing tab for business personalization and billing rules; Admin now focuses on backup/import/export tooling.
- Configure pricing guardrails including minimum charge, setup fee, rush fee %, and waste factor %.
- Material customer pricing now applies global material markup plus configured per-material-type markup without an implicit default type markup.
- Manage business personalization in a dedicated Admin section (name, logo, address, email, phone, website).
- Customize site-wide background, text, search/input, and accent button colors, with quick presets (Light, Dark, High Contrast, Ocean, Forest, Night Shift, Workshop Blue, Paper Invoice).
- Billing numeric fields now support clearing values without immediately forcing `0` while typing.
- Preview and print a customer-facing invoice directly under the selected expanded job card, including simplified line items and totals (`SubTotal`, `Delivery`, `VAT`, `Grand total`) plus deposits (`Suggested deposit`, `Deposit paid`, `Balance due`) and business/customer contact details, with explicit `Print / Save PDF` and `Close invoice` actions.
- Invoice finance completeness now includes payment terms (days), per-job payment status, and per-job deposit tracking.
- Export/import jobs CSV and materials CSV, plus dedicated JSON backup/restore options for customers, suppliers (with purchase history), and machines (with machine profiles and Bambu telemetry).
- Manage full backup/restore snapshots from Admin tools, covering all customizable and operational data: theme colors, billing settings, machine settings, jobs, materials, customers, suppliers, purchases, and Bambu machine data.
- Import emailed help-intake JSON files from Admin (`Help requests inbox`) to insert requests into `docs/backlog.md` with `Human Review` and `On Hold` status.
- App header now prefixes the title with business name, shows business logo at top-right, and dashboard contains the jobs/materials status lozenge.
- App footer and invoice footer both include configured business contact details (address, email, phone, website).
- Docker compose workflow now includes service health checks and frontend startup dependency on backend health for more reliable local runtime startup.

**Theme Presets And Branding**
- Go to Admin and use Site theme colors to style the entire app.
- You can set five theme fields: background, text, search/input, accent button, and accent button text.
- Start from a quick preset row, then fine-tune.
- Presets available: Light, Dark, High Contrast, Ocean, Forest, Night Shift, Workshop Blue, Paper Invoice.
- Save the theme to persist branding preferences for future sessions.

**Running locally**
- Prerequisites:
- Install `Node.js` (recommended: v20 LTS or newer).
- Install `npm` (bundled with Node.js).
- Optional: install `Docker Desktop` if you prefer Docker Compose instead of running Node directly.
- No required `.env` file for local default setup.
- First-time setup (required once after clone):
- `cd backend && npm install`
- `npx prisma generate`
- `npx prisma migrate deploy`
- `cd ../frontend && npm install`
- Optional owner-only backlog import setup:
- Preferred setup: copy `backend/.env.local.example` to `backend/.env.local` and fill values.
- `backend/.env.local` is loaded automatically by backend startup and is git-ignored.
- GitHub owner OAuth:
- Choose one identity method (plain or hashed):
- Plain: `APP_OWNER_GITHUB_LOGIN=<owner-github-login>`
- Hashed: `APP_OWNER_GITHUB_LOGIN_SHA256=<sha256-of-owner-github-login>`
- Generate hash example: `printf "%s" "<owner-github-login>" | shasum -a 256 | awk '{print $1}'`
- `GITHUB_OAUTH_CLIENT_ID=<github-oauth-app-client-id>`
- `GITHUB_OAUTH_CLIENT_SECRET=<github-oauth-app-client-secret>`
- Set GitHub OAuth callback URL to:
- `http://localhost:4000/api/admin/owner/oauth/github/callback`
- Microsoft owner OAuth:
- Choose one identity method (plain or hashed):
- Plain: `APP_OWNER_MICROSOFT_EMAIL=<owner-microsoft-email>`
- Hashed: `APP_OWNER_MICROSOFT_EMAIL_SHA256=<sha256-of-owner-microsoft-email>`
- Generate hash example: `printf "%s" "<owner-microsoft-email>" | shasum -a 256 | awk '{print $1}'`
- `MICROSOFT_OAUTH_CLIENT_ID=<microsoft-app-client-id>`
- `MICROSOFT_OAUTH_CLIENT_SECRET=<microsoft-app-client-secret>`
- Set Microsoft redirect URI to:
- `http://localhost:4000/api/admin/owner/oauth/microsoft/callback`
- Optional:
- `APP_OWNER_OAUTH_REDIRECT_BASE=http://localhost:4000`
- `APP_OWNER_SESSION_TTL_MS=28800000`
- Common reasons owner login fails:
- Backend was not restarted after changing `backend/.env.local`.
- OAuth app callback/redirect URI does not exactly match the URLs above.
- Owner identity configured in plain/hash does not match the signed-in account.
- `APP_OWNER_OAUTH_REDIRECT_BASE` does not match backend host/port actually used.
- In Admin > Help requests inbox, use `Owner auth diagnostics` to see readiness by provider (identity/client ID/client secret) and expected callback URLs without exposing secret values.
- When configured, only an authenticated owner OAuth session can use `Import to backlog`, and non-owners will not see that action. Owner identity is not exposed in owner-session status responses.
- Start locally (two options):
- Option 1: one command from repo root: `bash start-local.sh`
- Option 2: start each service manually:
- Backend: `cd backend && npm run dev` (API: `http://localhost:4000`)
- Frontend: `cd frontend && npm run dev -- --host 127.0.0.1 --port 5173` (UI: `http://127.0.0.1:5173`)
- Verify backend is running: `curl http://127.0.0.1:4000/api/health`
- Common fixes:
- If `start-local.sh` fails with permissions, run: `chmod +x start-local.sh`
- If Prisma/table errors appear, rerun in `backend`: `npx prisma migrate deploy`
- If ports are already in use, stop old dev servers using ports `4000` and `5173` and restart.

**Running with Docker Compose**
- Build and start: `docker compose up --build`
- Backend health endpoint: `http://127.0.0.1:4000/api/health`
- Frontend app: `http://127.0.0.1:5173`

**Local run links**
- App UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- API health: [http://127.0.0.1:4000/api/health](http://127.0.0.1:4000/api/health)

If the UI appears unresponsive, verify both ports are listening (`4000` and `5173`) and restart both dev servers.

**Tech stack**
- Backend: Node.js + TypeScript, Prisma ORM, SQLite (for local/dev) — see `backend/`.
- Frontend: Vite + React + TypeScript — see `frontend/`.
- Dev workflow: Docker Compose for local setup (see `docker-compose.yml`).

**Release and documentation hygiene**
- Version bumps in the backend and frontend package manifests should be paired with a matching changelog entry in `docs/CHANGELOG.md`.
- A repository check now enforces this when version changes are introduced, so release notes are less likely to be missed.

**Implementation tracking**
- Tracker workflow and update automation rules are in `docs/agent.md`.
- Planned and in-progress work is tracked in `docs/backlog.md`.
- Implemented features and completed bug fixes are tracked in `docs/implementation-log.md`.
- Release notes are tracked in `docs/CHANGELOG.md`.

**Backlog workflow commands**
- Validate tracker consistency: `node scripts/check-tracker-consistency.js`
- Validate release-note hygiene when versions change: `node scripts/check-release-notes.js`
- Validate quality-audit cadence: `node scripts/check-quality-cadence.js`
- Start backend and frontend together from repo root: `bash start-local.sh`

**Project scope baseline**
- Original scope/goals from the initial planning brief are now maintained here (merged from `docs/input.md`).
- Core baseline outcomes:
	- Job creation and tracking
	- File upload support for fabrication workflows
	- Material tracking and low-stock visibility
	- Automatic cost calculation and breakdown
	- Dashboard summaries
	- Dockerized local runtime

**Delivery baseline**
- Backend: Node.js + Express + Prisma
- Frontend: React + Vite
- Infrastructure: Docker + Docker Compose
- Evolving roadmap and execution status should be tracked via the tracker docs, not a separate input brief.

See `docs/CHANGELOG.md` for version history and recent changes.
