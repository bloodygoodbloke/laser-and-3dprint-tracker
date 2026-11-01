# MakerFlow

**Workshop operations software for makers and small fabricators.**

**Your workshop, organised.** MakerFlow helps makers run their workshop like a business by bringing production jobs, materials, customers, suppliers, stock, and costs into one practical workflow.

Built by a maker for people already selling made-to-order products: 3D printing businesses, laser engraving shops, and small fabrication workshops.

## Who MakerFlow is for
- 3D printing businesses that need quoting, stock tracking, material usage, and profitability visibility.
- Laser engraving businesses managing material stock, repeat customers, supplier costs, and order tracking.
- Small fabrication workshops that need practical job management, inventory, and quotations.

**Key benefits**
- Accurate materials accounting and low-volume inventory management.
- Job tracking for scheduling and prioritization of equipment use.
- Simple auditing of prints and cuts for cost-recovery or chargeback models.
- Central pricing controls for customer invoicing and markup-based billing.

**Current functionality**
- Manage jobs with customer details, machine type, machine runtime, and separate labour time.
- Start a quote with the basics (job, customer, equipment, estimated print time, and materials); costs are calculated when saved, with production tracking details available when you edit the job.
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
- Manage supplier records, website URLs, and material purchase history (material, quantity, cost, date, notes) from a dedicated Suppliers tab.
- Track margin reporting by machine, material type, and customer from the Reports page.
- Monitor delivery and utilization KPIs including on-time rate, overdue open jobs, queued runtime, and per-machine utilization.
- Use a dedicated Reports page with date-range, status, machine, and customer filters plus CSV export-ready report rows, summary metrics, and margin breakdown views.
- Use the Help page as an in-app guide and raise bug/feature requests directly from the app. Each submission creates a GitHub issue (labelled `bug` or `enhancement`) with app version, build number, environment, browser and date/time attached, then shows the issue number and link. See `docs/github-issues.md`.
- Bambu telemetry is currently shown as an alpha/coming-soon feature in Machines; live status, event automation, spool deductions, failure logs, and predictive maintenance are not currently available in the app.
- Add a generic Model URL to a quote from 3Drop, Printables (Prusa), MakerWorld, Thingiverse, or Cults3D. The backend tries to read the model title and fills the job name; the source link is saved with the job. Job File Preview can also embed the source page's image directly, without downloading or storing the picture in MakerFlow. Title and image lookup depend on each site allowing page access, so enter the name manually if lookup is blocked or the link is a search/category page.
- Manage machine profiles from a dedicated Machines tab with add/edit/remove workflows.
- Calculate production costs for 3D and laser workflows using machine runtime electricity + depreciation plus separate labour-time charging.
- Configure billing rules for percentage markups, electricity, labour rate, workshop hourly rate, per-machine wattage/depreciation assumptions, and invoice add-ons (delivery + VAT).
- Use the dedicated Billing tab for business personalization and billing rules; Admin now focuses on backup/import/export tooling.
- Configure pricing guardrails including minimum charge, setup fee, rush fee %, and waste factor %.
- Material customer pricing now applies global material markup plus configured per-material-type markup without an implicit default type markup.
- Manage business personalization in a dedicated Admin section (name, logo, address, email, phone, website).
- Customize site-wide background, text, search/input, and accent button colors; the default is the white MakerFlow palette, with presets for MakerFlow, Light, Dark, High Contrast, Forest, Night Shift, and Paper Invoice.
- Billing numeric fields now support clearing values without immediately forcing `0` while typing.
- Preview and print a customer-facing invoice directly under the selected expanded job card, including simplified line items and totals (`SubTotal`, `Delivery`, `VAT`, `Grand total`) plus deposits (`Suggested deposit`, `Deposit paid`, `Balance due`) and business/customer contact details, with explicit `Print / Save PDF` and `Close invoice` actions.
- Invoice finance completeness now includes payment terms (days), per-job payment status, and per-job deposit tracking.
- Use one Admin Backup and restore card with checkboxes to select Workshop, Customers, Suppliers, and Billing sections for a single JSON backup. Workshop jobs, materials, and equipment are grouped so their relationships stay intact.
- Restore a selected MakerFlow backup by replacing only its included sections while keeping the rest of the current data. Older full and individual JSON backups and legacy jobs/materials CSV backups are still supported; restoring a full backup replaces all current app data.
- The app header keeps MakerFlow and workshop branding separate: the MakerFlow logo at top-left links to Dashboard, while the configured business name and logo remain at top-right; clicking the business logo opens Billing.
- Invoices retain the workshop's own business identity and contact details, with a small “Made with MakerFlow” footer. The app footer also includes configured business contact details (address, email, phone, website).
- Docker compose workflow now includes service health checks and frontend startup dependency on backend health for more reliable local runtime startup.

**Theme Presets And Branding**
- Go to Admin and use Site theme colors to style the entire app.
- You can set five theme fields: background, text, search/input, accent button, and accent button text.
- Start from a quick preset row, then fine-tune.
- The default branding uses a white background, charcoal text, soft grey inputs, and the MakerFlow palette: primary blue `#3A7DFF`, dark blue `#1D63E7` for hover states, and light blue `#5DA8FF` for supporting highlights. Inter is the primary UI font.
- Presets available: MakerFlow, Light, Dark, High Contrast, Forest, Night Shift, Paper Invoice.
- Save the theme to persist branding preferences for future sessions.

**Running locally**
- Prerequisites:
- Install Node.js 26.13.0 LTS (or a later Node 26 LTS patch) and npm. The repository includes `.nvmrc` for version managers such as nvm.
- - Optional: install `Docker Desktop` if you prefer Docker Compose instead of running Node directly.
- No required `.env` file for local default setup.
- The root `start-local.sh` script sets `DATABASE_URL=file:./prisma/dev.db` by default before running Prisma; a `DATABASE_URL` you set explicitly takes precedence.
- First-time setup (required once after clone):
- `cd backend && npm ci`
- `npx prisma generate`
- `npx prisma migrate deploy`
- `cd ../frontend && npm ci`
- Optional local env setup:
- Preferred setup: copy `backend/.env.local.example` to `backend/.env.local` and fill values as needed.
- `backend/.env.local` is loaded automatically by backend startup and is git-ignored.
- To enable Help-page issue reporting locally, set `GITHUB_TOKEN` (and optionally `GITHUB_REPOSITORY`) in `backend/.env.local`; see `docs/github-issues.md`.
- Start locally (two options):
- Option 1: one command from repo root: `bash start-local.sh`
- Stop the local frontend and backend from another terminal: `bash stop-local.sh`
- Option 2: start each service manually:
- Backend: `cd backend && npm run dev` (API: `http://localhost:4000`)
- Frontend: `cd frontend && npm run dev -- --host 127.0.0.1 --port 5173` (UI: `http://127.0.0.1:5173`)
- Verify backend is running: `curl http://127.0.0.1:4000/api/health`
- Common fixes:
- If `start-local.sh` fails with permissions, run: `chmod +x start-local.sh`
- If `stop-local.sh` fails with permissions, run: `chmod +x stop-local.sh`
- If Prisma/table errors appear, rerun in `backend`: `npx prisma migrate deploy`
- If ports are already in use, stop old dev servers using ports `4000` and `5173` and restart.

**Running with Docker Compose**
- Build and start: `docker compose up --build`
- Backend health endpoint: `http://127.0.0.1:4000/api/health`
- Frontend app: `http://127.0.0.1:5173`

**Staging deployment**
- Build and start the staging stack: `docker compose -f docker-compose.staging.yml up --build`
- Staging frontend: `http://127.0.0.1:8080`
- Backend health endpoint: `http://127.0.0.1:4000/api/health`
- Staging uses a persistent SQLite volume and a reverse-proxied frontend so the browser talks to one origin.
- For public production, swap SQLite for Postgres and move secrets to a managed secret store.

**Local run links**
- App UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- API health: [http://127.0.0.1:4000/api/health](http://127.0.0.1:4000/api/health)

If the UI appears unresponsive, verify both ports are listening (`4000` and `5173`) and restart both dev servers.

**Tech stack**
- Runtime: Node.js 26.13 LTS (`.nvmrc` pins the baseline; package engines require Node 26).
- Backend: TypeScript 7, Express 5, Prisma ORM 7 with the better-sqlite3 adapter, and SQLite for local/dev — see `backend/`.
- Frontend: React 19, Vite 8, TypeScript 7, and Tailwind CSS 4 — see `frontend/`.
- Dev workflow: Docker Compose for local setup (see `docker-compose.yml`).

**Release and documentation hygiene**
- Version bumps in both backend and frontend manifests and lockfiles should be paired with a dated release section in `docs/CHANGELOG.md`.
- A repository check now enforces this when version changes are introduced, so release notes are less likely to be missed.

**Implementation tracking**
- Tracker workflow and update automation rules are in `docs/agent.md`.
- Open bugs and feature requests are tracked in GitHub Issues (see `docs/github-issues.md`).
- Implemented features and completed bug fixes are tracked in `docs/implementation-log.md`.
- Release notes are tracked in `docs/CHANGELOG.md`.
- Sign-in, super admin and user access setup is in `docs/authentication.md`.

**Tracker workflow commands**
- Validate tracker consistency: `node scripts/check-tracker-consistency.js`
- Validate release-note hygiene when versions change: `node scripts/check-release-notes.js`
- Validate quality-audit cadence: `node scripts/check-quality-cadence.js`
- Start backend and frontend together from repo root: `bash start-local.sh`

**Local testing and smoke checks**
- See `docs/local-testing-and-checks.md` for terminal-first checks you can run directly on your machine.

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

## Versioning and deployment diagnostics
- `GET /api/version` reports `version`, `buildNumber`, `gitCommit`, `gitBranch`, `buildDate` and `environment`; the footer (`v<version> (<build>)`) and Help > Deployment Information show the same data.
- The semantic version is the `package.json` version; build metadata is injected by GitHub Actions through Docker build args and Container App env vars.
- See [docs/versioning-and-deployment.md](docs/versioning-and-deployment.md) for how versions and build numbers work, how to identify and verify what is running in Azure, and troubleshooting.
