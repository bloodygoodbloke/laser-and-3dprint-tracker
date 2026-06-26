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

**Tech stack**
- Backend: Node.js + TypeScript, Prisma ORM, SQLite (for local/dev) — see `backend/`.
- Frontend: Vite + React + TypeScript — see `frontend/`.
- Dev workflow: Docker Compose for local setup (see `docker-compose.yml`).

See `CHANGELOG.md` for version history and recent changes.
