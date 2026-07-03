# laser-and-3dprint-tracker

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
- Add multi-material usage per job with simplified material selection plus quantity in grams.
- Track materials with colour, grouped material-type views, and quick copy/edit workflows.
- Material creation/editing is managed in the Materials tab (Admin no longer contains a duplicate add-material form).
- Manage CRM Lite customer records (name, address, email, phone, notes) with recent order history lookup.
- Manage machine profiles from a dedicated Machines tab with add/edit/remove workflows.
- Calculate production costs for 3D and laser workflows using machine runtime electricity + depreciation plus separate labour-time charging.
- Configure billing rules for percentage markups, electricity, labour rate, workshop hourly rate, per-machine wattage/depreciation assumptions, and invoice add-ons (delivery + VAT).
- Configure pricing guardrails including minimum charge, setup fee, rush fee %, and waste factor %.
- Material customer pricing now applies global material markup plus configured per-material-type markup without an implicit default type markup.
- Manage business personalization in a dedicated Admin section (name, logo, address, email, phone, website).
- Billing numeric fields now support clearing values without immediately forcing `0` while typing.
- Preview and print a customer-facing invoice directly under the selected expanded job card, including simplified line items and totals (`SubTotal`, `Delivery`, `VAT`, `Grand total`) plus deposits (`Suggested deposit`, `Deposit paid`, `Balance due`) and business/customer contact details, with explicit `Print / Save PDF` and `Close invoice` actions.
- Invoice finance completeness now includes payment terms (days), per-job payment status, and per-job deposit tracking.
- Export/import jobs CSV, export/import materials CSV, and manage full backup/restore snapshots from Admin tools.
- App header now prefixes the title with business name, shows business logo at top-right, and dashboard contains the jobs/materials status lozenge.
- App footer and invoice footer both include configured business contact details (address, email, phone, website).

**Running locally**
- Backend: `cd backend && npm install && npm run dev` (API: `http://localhost:4000`)
- Frontend: `cd frontend && npm install && npm run dev -- --host 127.0.0.1 --port 5173` (UI: `http://127.0.0.1:5173`)
- Health check: `curl http://127.0.0.1:4000/api/health`

**Local run links**
- App UI: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- API health: [http://127.0.0.1:4000/api/health](http://127.0.0.1:4000/api/health)

If the UI appears unresponsive, verify both ports are listening (`4000` and `5173`) and restart both dev servers.

**Tech stack**
- Backend: Node.js + TypeScript, Prisma ORM, SQLite (for local/dev) — see `backend/`.
- Frontend: Vite + React + TypeScript — see `frontend/`.
- Dev workflow: Docker Compose for local setup (see `docker-compose.yml`).

**Release and documentation hygiene**
- Version bumps in the backend and frontend package manifests should be paired with a matching changelog entry in `CHANGELOG.md`.
- A repository check now enforces this when version changes are introduced, so release notes are less likely to be missed.

**Implementation tracking**
- Ongoing feature status is tracked in `IMPLEMENTATION_TRACKER.md`.

See `CHANGELOG.md` for version history and recent changes.
