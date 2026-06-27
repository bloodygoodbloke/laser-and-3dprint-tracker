# laser-and-3dprint-tracker

Laser and 3D Print Tracker is a lightweight system for managing jobs, materials, and usage in small-scale fabrication environments such as makerspaces, fabrication labs, and small production shops.

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
- Create jobs directly from the Jobs tab and edit existing jobs from expandable job cards.
- Add multi-material usage per job with simplified material selection plus quantity in grams.
- Track materials with colour, grouped material-type views, and quick copy/edit workflows.
- Manage machine profiles from a dedicated Machines tab with add/edit/remove workflows.
- Calculate production costs for 3D and laser workflows using machine runtime electricity + depreciation plus separate labour-time charging.
- Configure billing rules for percentage markups, electricity, labour rate, workshop hourly rate, and per-machine wattage/depreciation assumptions.
- Preview and print a customer-facing invoice from within the selected job workflow.
- Export/import jobs and materials, plus full backup/restore snapshots from Admin tools.

**Running locally**
- Backend: `cd backend && npm install && npm run dev` (API: `http://localhost:4000`)
- Frontend: `cd frontend && npm install && npm run dev -- --host 127.0.0.1 --port 5173` (UI: `http://127.0.0.1:5173`)
- Health check: `curl http://127.0.0.1:4000/api/health`

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
