# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Added `IMPLEMENTATION_TRACKER.md` to track implemented, in-progress, and planned work.
- Added `Last updated` and `Next 3 Tasks` sections to keep immediate priorities visible.
- Updated `README.md` with a direct link to the implementation tracker.
- Redesigned Billing Rules UI into clear Electricity, Materials, Labour (plus Overhead) sections.
- Added per-material-type markup controls in Billing Rules and wired them into persisted settings.
- Added per-machine depreciation cost and replacement runtime inputs in Billing Rules and wired them into runtime costing.
- Renamed overhead billing to workshop costs and switched workshop charging to a base hourly rate model.
- Added `workshopHourlyRate` to billing settings with migration `20260627013000_add_workshop_hourly_rate`.
- Simplified markups to percentage-only calculations (removed fixed amount markups in UI and cost engine).
- Set default markup behavior to 25% for material, electricity, and material-type pricing rules.
- Removed default depreciation fallback inputs from runtime profiles while keeping per-machine depreciation and replacement runtime fields.
- Added a dedicated Machines tab with add/edit/remove workflows for machine profiles and billing runtime settings.
- Wired job machine selectors to use managed machine profiles, seeded from existing default machine definitions and saved billing settings.
- Updated README feature list to reflect Machines tab, workshop-cost billing language, and Admin backup tooling.
- Added local run/health/restart guidance to README for faster recovery when frontend or backend services are not responding.
- Cleaned changelog release ordering by normalizing the initial release heading to `0.1.0` and placing `0.1.1` before it.
- Updated in-app Help guide content to reflect current job creation, machine profile management, workshop-cost billing, invoice flow, backup options, and service health troubleshooting.

## [0.3.0] - 2026-06-26
- Added separate job timing fields for machine runtime and labour time so jobs can reflect different effort profiles.
- Added depreciation billing inputs (`depreciationCost`, `depreciationHours`) and integrated depreciation into machine runtime cost calculations.
- Updated cost calculation logic so machine runtime cost includes electricity plus depreciation while labour remains a separate timed charge.
- Added dedicated add-job flow inside Jobs tab, with in-tab create form and clearer edit workflow.
- Made each job card expandable to quickly view details and jump into editing/cost actions.
- Moved invoice access into the job detail flow and refined invoice layout for customer-facing output.
- Simplified job material usage input to material + quantity in grams; unit/cost are now derived from selected material data.
- Added grouped materials view by material type with quick copy and quick edit actions.
- Added machine label correction from `30918 CNC/Laser` to `3018 CNC/Laser` and reordered machine defaults to prioritize BambuLab and Creality entries.
- Added schema migration for runtime/depreciation fields and updated backup restore handling for new job timing fields.

Files changed in this release:
- `backend/prisma/schema.prisma` — added depreciation settings and split job runtime/labour fields.
- `backend/prisma/migrations/20260626233500_runtime_and_depreciation/migration.sql` — migration for new runtime/depreciation columns.
- `backend/src/routes/jobs.ts` — separated runtime/labour cost inputs and applied depreciation in runtime cost.
- `backend/src/routes/admin.ts` — backup import/restore support for new job timing fields.
- `frontend/src/App.tsx` — jobs/materials UX updates, invoice placement/layout changes, and new runtime/labour/depreciation UI.
- `frontend/src/api.ts` and `frontend/src/types.ts` — updated typing and CSV handling for new runtime/labour model.
- `README.md` and `CHANGELOG.md` — documentation updates.

## [0.2.0] - 2026-06-26
- Added central billing settings for percentage and fixed-value markup adjustments.
- Added job-based invoice preview and print/PDF-ready output for customer charges.
- Extended the frontend with a Billing view for pricing rules and invoice preview.
- Documented the release-check workflow so future version bumps require a matching changelog entry.

Files changed in this release:
- `backend/prisma/schema.prisma` — added billing settings and customer charge support.
- `backend/src/routes/billing.ts` — new billing settings API route.
- `backend/src/routes/jobs.ts` — job cost calculation now includes customer charge output.
- `frontend/src/App.tsx` — added billing and invoice UI.
- `frontend/src/api.ts` and `frontend/src/types.ts` — frontend support for billing settings.
- `README.md` and `CHANGELOG.md` — documentation and release-process updates.

## [0.1.1] - 2026-06-26 21:43:52Z
- Backend: added `JobCost` Prisma model and persisted cost calculations.
- Backend: added `POST /api/jobs/:id/calculate-cost` to compute and store job costs (3D & laser examples).
- Backend: added `POST /api/jobs/:id/upload` to update a job's `filePath`.
- Added `.env.example` with cost calculation defaults.

Files changed in this release:
- `backend/prisma/schema.prisma` — added `JobCost` model.
- `backend/src/routes/jobs.ts` — added upload and calculate-cost endpoints.
- `.env.example` — example environment variables for rates.

## [0.1.0] - 2026-06-26 21:34:24Z
- Added initial changelog and versioning starting at 0.1.
- Updated `README.md` with industry context, benefits, and tech stack information.

Files changed in this release:
- `README.md` — expanded project description and industry information.
- `CHANGELOG.md` — this file.
