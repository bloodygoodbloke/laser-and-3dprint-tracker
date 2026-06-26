# Changelog

All notable changes to this project will be documented in this file.

## [0.1] - 2026-06-26 21:34:24Z
- Added initial changelog and versioning starting at 0.1.
- Updated `README.md` with industry context, benefits, and tech stack information.

Files changed in this release:
- `README.md` — expanded project description and industry information.
- `CHANGELOG.md` — this file.

---

Notes:
- This is the initial release for documentation and does not reflect any API or database schema versioning beyond repository state.

## [0.1.1] - 2026-06-26 21:43:52Z
- Backend: added `JobCost` Prisma model and persisted cost calculations.
- Backend: added `POST /api/jobs/:id/calculate-cost` to compute and store job costs (3D & laser examples).
- Backend: added `POST /api/jobs/:id/upload` to update a job's `filePath`.
- Added `.env.example` with cost calculation defaults.

Files changed in this release:
- `backend/prisma/schema.prisma` — added `JobCost` model.
- `backend/src/routes/jobs.ts` — added upload and calculate-cost endpoints.
- `.env.example` — example environment variables for rates.
